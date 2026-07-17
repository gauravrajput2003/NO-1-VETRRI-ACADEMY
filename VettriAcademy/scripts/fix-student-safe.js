const fs = require('fs');
const path = require('path');
const studentDir = 'D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/screens/student';
const screens = fs.readdirSync(studentDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));
let modified = [];

screens.forEach(s => {
  const p = path.join(studentDir, s);
  let code = fs.readFileSync(p, 'utf8');
  let originalCode = code;

  if(!code.includes('useTabBarScroll')) {
    code = `import { useTabBarScroll } from '../../context/TabBarVisibilityContext';\n` + code;
  }
  if(!code.includes('useBottomTabBarPadding')) {
    code = `import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';\n` + code;
  }

  if(!code.includes('useTabBarScroll()')) {
    if(code.includes('const dispatch = useDispatch();')) {
      code = code.replace(/const dispatch = useDispatch\(\);/, match => match + `\n  const bottomPadding = useBottomTabBarPadding();\n  const { onScroll: onTabBarScroll } = useTabBarScroll();`);
    } else {
      code = code.replace(/(export default function [^)]+\)\s*\{)/, match => match + `\n  const bottomPadding = useBottomTabBarPadding();\n  const { onScroll: onTabBarScroll } = useTabBarScroll();`);
    }
  }

  if (!code.includes('onScroll={onTabBarScroll}')) {
     code = code.split('<ScrollView ').join('<ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} ');
     code = code.split('<ScrollView\n').join('<ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16}\n');
     code = code.split('<FlatList ').join('<FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} ');
     code = code.split('<FlatList\n').join('<FlatList onScroll={onTabBarScroll} scrollEventThrottle={16}\n');
  }

  code = code.replace(/paddingBottom:\s*24(?!}|\s*,\s*bottomPadding|\s*\)|\s*\])/g, 'paddingBottom: Math.max(24, bottomPadding)');
  code = code.replace(/paddingBottom:\s*20(?!}|\s*,\s*bottomPadding|\s*\)|\s*\])/g, 'paddingBottom: Math.max(20, bottomPadding)');
  code = code.replace(/paddingBottom:\s*16(?!}|\s*,\s*bottomPadding|\s*\)|\s*\])/g, 'paddingBottom: Math.max(16, bottomPadding)');
  code = code.replace(/paddingBottom:\s*100(?!}|\s*,\s*bottomPadding|\s*\)|\s*\])/g, 'paddingBottom: Math.max(100, bottomPadding)');
  code = code.replace(/paddingBottom:\s*80(?!}|\s*,\s*bottomPadding|\s*\)|\s*\])/g, 'paddingBottom: Math.max(80, bottomPadding)');
  code = code.replace(/paddingBottom:\s*40(?!}|\s*,\s*bottomPadding|\s*\)|\s*\])/g, 'paddingBottom: Math.max(40, bottomPadding)');
  code = code.replace(/paddingBottom:\s*50(?!}|\s*,\s*bottomPadding|\s*\)|\s*\])/g, 'paddingBottom: Math.max(50, bottomPadding)');

  if(code !== originalCode) {
     fs.writeFileSync(p, code);
     modified.push(s);
  }
});
console.log('Patched student screens:', modified.join(', '));
