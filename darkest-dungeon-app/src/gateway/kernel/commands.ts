import type { CommandKernel } from './commandKernel.ts';

export const ROSTER_LIMIT = 25;

export function getRecruitCost(resolveLevel: number): number {
  return 1000 * (resolveLevel + 1);
}

export function registerRecruitHeroCommand(kernel: CommandKernel): void {
  kernel.register<{ heroUid: string }>('dd.recruitHero', (ctx, payload) => {
    const hero = ctx.state.town.stagecoachHeroes.find(
      (candidate) => candidate.uid === payload.heroUid
    );
    if (!hero) {
      return { status: 'rejected', reason: '驿站中没有该英雄' };
    }

    const cost = getRecruitCost(hero.resolveLevel);
    if (ctx.state.game.gold < cost) {
      return { status: 'rejected', reason: `金币不足（需要 ${cost}）` };
    }
    if (ctx.state.game.roster.length >= ROSTER_LIMIT) {
      return { status: 'rejected', reason: `名册已满（${ROSTER_LIMIT} 人上限）` };
    }

    return {
      status: 'ok',
      summary: `招募 ${hero.name}（${hero.classId}）`,
      nextState: {
        ...ctx.state,
        game: {
          ...ctx.state.game,
          gold: ctx.state.game.gold - cost,
          roster: [...ctx.state.game.roster, hero],
        },
        town: {
          ...ctx.state.town,
          stagecoachHeroes: ctx.state.town.stagecoachHeroes.filter(
            (candidate) => candidate.uid !== hero.uid
          ),
        },
      },
    };
  });
}
