const fs = require('fs');
const path = require('path');
const adminDir = 'D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/screens/admin';
const screens = ['DashboardScreen.jsx', 'ClassSchedulerScreen.jsx', 'ManageStudentsScreen.jsx', 'ManageTeachersScreen.jsx', 'FeeManagementScreen.jsx', 'SalaryManagementScreen.jsx', 'AdminMaterialsScreen.jsx', 'AdminTrainingVideosScreen.jsx', 'AnnouncementsScreen.jsx', 'AdminLeavesScreen.jsx', 'EnquiriesScreen.jsx', 'CourseManagementScreen.jsx', 'LiveMonitorScreen.jsx'];

screens.forEach(s => {
  const p = path.join(adminDir, s);
  if (!fs.existsSync(p)) return;
  let code = fs.readFileSync(p, 'utf8');

  if(!code.includes('useBottomTabBarPadding')) {
    code = `import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';\nimport { useTabBarScroll } from '../../context/TabBarVisibilityContext';\n` + code;
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

  if (!code.includes('bottomPadding')) {
    code = code.split('paddingBottom: 24').join('paddingBottom: Math.max(24, bottomPadding)');
    code = code.split('paddingBottom: 20').join('paddingBottom: Math.max(20, bottomPadding)');
    code = code.split('paddingBottom: 16').join('paddingBottom: Math.max(16, bottomPadding)');
    code = code.split('paddingBottom: 100').join('paddingBottom: Math.max(100, bottomPadding)');
    code = code.split('paddingBottom: 80').join('paddingBottom: Math.max(80, bottomPadding)');
    code = code.split('paddingBottom: 40').join('paddingBottom: Math.max(40, bottomPadding)');
    code = code.split('paddingBottom: 50').join('paddingBottom: Math.max(50, bottomPadding)');
  }

  fs.writeFileSync(p, code);
  console.log('Patched', s);
});
console.log('Done!');
