#!/usr/bin/env node
/**
 * DD 资产复制脚本 — 将 DD 游戏素材复制到项目 public 目录
 * 复制：英雄技能图标、英雄立绘、怪物图标、UI 元素
 *
 * 用法: node scripts/copy-dd-assets.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DD_ROOT = 'E:\\SteamLibrary\\steamapps\\common\\DarkestDungeon';
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'dd-assets');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

// 复制英雄技能图标
function copyHeroAbilityIcons() {
  console.log('\n=== 复制英雄技能图标 ===');
  const heroesDir = path.join(DD_ROOT, 'heroes');
  const destDir = path.join(PUBLIC_DIR, 'heroes');
  let count = 0;

  const heroDirs = fs.readdirSync(heroesDir).filter(f =>
    fs.statSync(path.join(heroesDir, f)).isDirectory()
  );

  for (const heroName of heroDirs) {
    const heroDir = path.join(heroesDir, heroName);
    const destHeroDir = path.join(destDir, heroName);
    ensureDir(destHeroDir);

    // 复制 ability 图标 (crusader.ability.one.png 等)
    const files = fs.readdirSync(heroDir);
    for (const file of files) {
      if (file.match(/\.ability\.\w+\.png$/i) || file.match(/\.portrait\.png$/i)) {
        if (copyFile(path.join(heroDir, file), path.join(destHeroDir, file))) {
          count++;
        }
      }
    }

    // 复制 icons_equip 目录
    const iconsDir = path.join(heroDir, 'icons_equip');
    if (fs.existsSync(iconsDir)) {
      const destIconsDir = path.join(destHeroDir, 'icons_equip');
      ensureDir(destIconsDir);
      const iconFiles = fs.readdirSync(iconsDir);
      for (const file of iconFiles) {
        if (file.endsWith('.png')) {
          if (copyFile(path.join(iconsDir, file), path.join(destIconsDir, file))) {
            count++;
          }
        }
      }
    }
  }

  console.log(`  + 复制 ${count} 个英雄图标文件`);
  return count;
}

// 复制怪物静态图标
function copyMonsterIcons() {
  console.log('\n=== 复制怪物图标 ===');
  const monstersDir = path.join(DD_ROOT, 'monsters');
  const destDir = path.join(PUBLIC_DIR, 'monsters');
  let count = 0;

  const monsterDirs = fs.readdirSync(monstersDir).filter(f =>
    fs.statSync(path.join(monstersDir, f)).isDirectory()
  );

  for (const dir of monsterDirs) {
    const subDir = path.join(monstersDir, dir);
    const variants = fs.readdirSync(subDir).filter(f =>
      fs.statSync(path.join(subDir, f)).isDirectory()
    );

    for (const variant of variants) {
      const variantDir = path.join(subDir, variant);
      const destVariantDir = path.join(destDir, dir, variant);
      ensureDir(destVariantDir);

      // 复制 .png 文件（精灵图集）
      const files = fs.readdirSync(variantDir);
      for (const file of files) {
        if (file.endsWith('.png')) {
          if (copyFile(path.join(variantDir, file), path.join(destVariantDir, file))) {
            count++;
          }
        }
      }
    }
  }

  console.log(`  + 复制 ${count} 个怪物图标文件`);
  return count;
}

// 复制 UI 图标和纹理
function copyUIAssets() {
  console.log('\n=== 复制 UI 资产 ===');
  let count = 0;

  // 复制饰品类别图标
  const trinketIconsDir = path.join(DD_ROOT, 'trinkets', 'icons');
  if (fs.existsSync(trinketIconsDir)) {
    const destDir = path.join(PUBLIC_DIR, 'trinkets');
    ensureDir(destDir);
    const files = fs.readdirSync(trinketIconsDir);
    for (const file of files) {
      if (file.endsWith('.png')) {
        if (copyFile(path.join(trinketIconsDir, file), path.join(destDir, file))) {
          count++;
        }
      }
    }
  }

  // 复制补给品图标
  const provisionIconsDir = path.join(DD_ROOT, 'campaign', 'provision', 'icons');
  if (fs.existsSync(provisionIconsDir)) {
    const destDir = path.join(PUBLIC_DIR, 'provisions');
    ensureDir(destDir);
    const files = fs.readdirSync(provisionIconsDir);
    for (const file of files) {
      if (file.endsWith('.png')) {
        if (copyFile(path.join(provisionIconsDir, file), path.join(destDir, file))) {
          count++;
        }
      }
    }
  }

  // 复制建筑图标
  const buildingIconsDir = path.join(DD_ROOT, 'campaign', 'town', 'buildings', 'icons');
  if (fs.existsSync(buildingIconsDir)) {
    const destDir = path.join(PUBLIC_DIR, 'buildings');
    ensureDir(destDir);
    const files = fs.readdirSync(buildingIconsDir);
    for (const file of files) {
      if (file.endsWith('.png')) {
        if (copyFile(path.join(buildingIconsDir, file), path.join(destDir, file))) {
          count++;
        }
      }
    }
  }

  console.log(`  + 复制 ${count} 个 UI 图标文件`);
  return count;
}

// 生成资产清单
function generateManifest() {
  console.log('\n=== 生成资产清单 ===');
  const manifest = {
    generatedAt: new Date().toISOString(),
    basePath: '/dd-assets',
    heroes: {},
    monsters: {},
    trinkets: [],
    provisions: [],
    buildings: [],
  };

  // 英雄资产
  const heroesDir = path.join(PUBLIC_DIR, 'heroes');
  if (fs.existsSync(heroesDir)) {
    for (const heroName of fs.readdirSync(heroesDir)) {
      const heroPath = path.join(heroesDir, heroName);
      if (!fs.statSync(heroPath).isDirectory()) continue;

      const abilities = [];
      const portraits = [];
      const equipIcons = [];

      for (const file of fs.readdirSync(heroPath)) {
        if (file.match(/\.ability\.\w+\.png$/i)) {
          const match = file.match(/\.ability\.(\w+)\.png$/i);
          if (match) {
            abilities.push({
              name: match[1],
              path: `/dd-assets/heroes/${heroName}/${file}`,
            });
          }
        }
        if (file.match(/\.portrait\.png$/i)) {
          portraits.push(`/dd-assets/heroes/${heroName}/${file}`);
        }
      }

      const iconsDir = path.join(heroPath, 'icons_equip');
      if (fs.existsSync(iconsDir)) {
        for (const file of fs.readdirSync(iconsDir)) {
          if (file.endsWith('.png')) {
            equipIcons.push(`/dd-assets/heroes/${heroName}/icons_equip/${file}`);
          }
        }
      }

      manifest.heroes[heroName] = { abilities, portraits, equipIcons };
    }
  }

  // 怪物资产
  const monstersDir = path.join(PUBLIC_DIR, 'monsters');
  if (fs.existsSync(monstersDir)) {
    for (const monsterClass of fs.readdirSync(monstersDir)) {
      const classPath = path.join(monstersDir, monsterClass);
      if (!fs.statSync(classPath).isDirectory()) continue;

      for (const variant of fs.readdirSync(classPath)) {
        const variantPath = path.join(classPath, variant);
        if (!fs.statSync(variantPath).isDirectory()) continue;

        const sprites = fs.readdirSync(variantPath)
          .filter(f => f.endsWith('.png'))
          .map(f => `/dd-assets/monsters/${monsterClass}/${variant}/${f}`);

        if (sprites.length > 0) {
          manifest.monsters[variant] = sprites;
        }
      }
    }
  }

  // 饰品图标
  const trinketsDir = path.join(PUBLIC_DIR, 'trinkets');
  if (fs.existsSync(trinketsDir)) {
    manifest.trinkets = fs.readdirSync(trinketsDir)
      .filter(f => f.endsWith('.png'))
      .map(f => `/dd-assets/trinkets/${f}`);
  }

  // 补给品图标
  const provisionsDir = path.join(PUBLIC_DIR, 'provisions');
  if (fs.existsSync(provisionsDir)) {
    manifest.provisions = fs.readdirSync(provisionsDir)
      .filter(f => f.endsWith('.png'))
      .map(f => `/dd-assets/provisions/${f}`);
  }

  // 建筑图标
  const buildingsDir = path.join(PUBLIC_DIR, 'buildings');
  if (fs.existsSync(buildingsDir)) {
    manifest.buildings = fs.readdirSync(buildingsDir)
      .filter(f => f.endsWith('.png'))
      .map(f => `/dd-assets/buildings/${f}`);
  }

  // 写入清单
  const manifestPath = path.join(PUBLIC_DIR, 'manifest.json');
  ensureDir(PUBLIC_DIR);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`  + 英雄: ${Object.keys(manifest.heroes).length}`);
  console.log(`  + 怪物: ${Object.keys(manifest.monsters).length}`);
  console.log(`  + 饰品图标: ${manifest.trinkets.length}`);
  console.log(`  + 补给品图标: ${manifest.provisions.length}`);
  console.log(`  + 建筑图标: ${manifest.buildings.length}`);
  console.log(`  → manifest.json`);

  return manifest;
}

// 主函数
function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  DD 资产复制脚本 — 素材 → public 目录      ║');
  console.log('╚══════════════════════════════════════════════╝');

  if (!fs.existsSync(DD_ROOT)) {
    console.error(`\n✗ DD 游戏目录不存在: ${DD_ROOT}`);
    process.exit(1);
  }

  ensureDir(PUBLIC_DIR);
  console.log(`\n输出目录: ${PUBLIC_DIR}`);

  copyHeroAbilityIcons();
  copyMonsterIcons();
  copyUIAssets();
  generateManifest();

  console.log('\n✓ 资产复制完成!');
}

main();
