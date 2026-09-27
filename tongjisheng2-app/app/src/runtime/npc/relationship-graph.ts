/**
 * NPC 关系网(阶段2 步骤3)
 *
 * 职责:
 *  - 20 女角关系图(无向图)
 *  - 查询女角的直接关系(朋友/情敌/姐妹等)
 *  - 关系影响行动:情敌同时在场→嫉妒值↑;姐妹/朋友→结伴出行概率↑
 *  - 嫉妒链扩展:NPC发现玩家与其他女角亲密→嫉妒值+→关系网波动
 *
 * 设计:
 *  - 静态关系边来自 relationship-data.ts
 *  - 动态关系状态(嫉妒值波动/关系变化)由 stat_data 驱动
 *  - 不修改状态,只提供查询和影响计算
 */

import {
  RELATION_EDGES,
  RELATION_ACTION_WEIGHT,
  type RelationType,
  type RelationEdge,
} from '../../content/npc/relationship-data';

// ───────────────────────────────────────────────────────────
//  关系图
// ───────────────────────────────────────────────────────────

export interface RelationQueryResult {
  /** 关系类型 */
  type: RelationType;
  /** 对方女角 ID */
  otherId: number;
  /** 关系强度 */
  strength: number;
  /** 备注 */
  note?: string;
}

export class RelationshipGraph {
  /** 邻接表:heroineId → RelationEdge[] */
  private adjacency = new Map<number, RelationEdge[]>();

  constructor() {
    this.buildAdjacency();
  }

  private buildAdjacency(): void {
    for (const edge of RELATION_EDGES) {
      // 无向图,两个方向都加
      const aList = this.adjacency.get(edge.a) ?? [];
      aList.push(edge);
      this.adjacency.set(edge.a, aList);

      const bList = this.adjacency.get(edge.b) ?? [];
      // 反向边:a 和 b 互换
      bList.push({ ...edge, a: edge.b, b: edge.a });
      this.adjacency.set(edge.b, bList);
    }
  }

  /**
   * 查询某女角的所有直接关系
   */
  getRelations(heroineId: number): RelationQueryResult[] {
    const edges = this.adjacency.get(heroineId) ?? [];
    return edges.map((e) => ({
      type: e.type,
      otherId: e.b,
      strength: e.strength,
      note: e.note,
    }));
  }

  /**
   * 查询某女角与另一女角的特定关系
   *  - 若有多重关系(如母女+情敌),返回第一个匹配
   */
  getRelationBetween(a: number, b: number, type?: RelationType): RelationEdge | undefined {
    const edges = this.adjacency.get(a) ?? [];
    return edges.find((e) => e.b === b && (!type || e.type === type));
  }

  /**
   * 查询某女角的所有情敌
   */
  getRivals(heroineId: number): number[] {
    return this.getRelations(heroineId)
      .filter((r) => r.type === '情敌')
      .map((r) => r.otherId);
  }

  /**
   * 查询某女角的所有姐妹/母女
   */
  getFamily(heroineId: number): number[] {
    return this.getRelations(heroineId)
      .filter((r) => r.type === '姐妹' || r.type === '母女')
      .map((r) => r.otherId);
  }

  /**
   * 查询某女角的所有朋友
   */
  getFriends(heroineId: number): number[] {
    return this.getRelations(heroineId)
      .filter((r) => r.type === '朋友')
      .map((r) => r.otherId);
  }

  /**
   * 计算两女角同时在场时的影响
   *  - 情敌:嫉妒值增量(正值,互相干扰)
   *  - 姐妹/母女/朋友:结伴系数(0-1,越高越倾向结伴)
   *  - 返回 { jealousyDelta, companionWeight }
   */
  computeCoPresenceEffect(a: number, b: number): {
    jealousyDelta: number;
    companionWeight: number;
    relationType?: RelationType;
  } {
    const edges = this.adjacency.get(a) ?? [];
    const edge = edges.find((e) => e.b === b);
    if (!edge) {
      return { jealousyDelta: 0, companionWeight: 0 };
    }

    const weight = RELATION_ACTION_WEIGHT[edge.type] ?? 0;
    const strengthFactor = edge.strength / 100;

    if (edge.type === '情敌') {
      // 情敌同时在场:嫉妒值+,强度越高增量越大
      return {
        jealousyDelta: Math.round(weight * strengthFactor * 10),
        companionWeight: 0,
        relationType: '情敌',
      };
    }

    // 姐妹/母女/朋友:结伴系数
    return {
      jealousyDelta: 0,
      companionWeight: weight * strengthFactor,
      relationType: edge.type,
    };
  }

  /**
   * 嫉妒链传播:NPC A 发现玩家与 NPC B 亲密 → A 的嫉妒值变化
   *  - A 和 B 是情敌:嫉妒值大幅+
   *  - A 和 B 是姐妹/母女:嫉妒值小幅+(复杂情感)
   *  - A 和 B 无关系:嫉妒值微量+(社会认知)
   *
   * @param heroineId 被影响的女角
   * @param intimateHeroineId 与玩家亲密的女角
   * @param intimacyLevel 亲密程度(0-100)
   * @returns 嫉妒值增量
   */
  computeJealousyPropagation(
    heroineId: number,
    intimateHeroineId: number,
    intimacyLevel: number,
  ): number {
    if (heroineId === intimateHeroineId) return 0;

    const edges = this.adjacency.get(heroineId) ?? [];
    const edge = edges.find((e) => e.b === intimateHeroineId);

    const intimacyFactor = intimacyLevel / 100;

    if (!edge) {
      // 无直接关系:微量嫉妒(社会认知)
      return Math.round(2 * intimacyFactor);
    }

    const strengthFactor = edge.strength / 100;

    switch (edge.type) {
      case '情敌':
        // 情敌:大幅嫉妒
        return Math.round(15 * strengthFactor * intimacyFactor);
      case '母女':
      case '姐妹':
        // 家人:复杂情感,中等嫉妒
        return Math.round(8 * strengthFactor * intimacyFactor);
      case '朋友':
        // 朋友:轻微嫉妒
        return Math.round(5 * strengthFactor * intimacyFactor);
      default:
        return Math.round(3 * intimacyFactor);
    }
  }

  /**
   * 获取全图关系边(用于 UI 可视化)
   */
  getAllEdges(): RelationEdge[] {
    return [...RELATION_EDGES];
  }
}

// 单例
export const relationshipGraph = new RelationshipGraph();
