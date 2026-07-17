const fs = require('fs');
const path = require('path');
const adminDir = 'D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/screens/admin';
const screens = ['DashboardScreen.jsx', 'ClassSchedulerScreen.jsx', 'ManageStudentsScreen.jsx', 'ManageTeachersScreen.jsx', 'FeeManagementScreen.jsx', 'SalaryManagementScreen.jsx', 'AdminMaterialsScreen.jsx', 'AdminTrainingVideosScreen.jsx', 'AnnouncementsScreen.jsx', 'AdminLeavesScreen.jsx', 'EnquiriesScreen.jsx', 'CourseManagementScreen.jsx', 'LiveMonitorScreen.jsx'];

screens.forEach(s => {
  const p = path.join(adminDir, s);
  if (!fs.existsSync(p)) return;
  let code = fs.readFileSync(p, 'utf8');

  // Add imports
  if(!code.includes('useBottomTabBarPadding')) {
    code = `import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';\nimport { useTabBarScroll } from '../../context/TabBarVisibilityContext';\n` + code;
  } else if(!code.includes('useTabBarScroll')) {
    code = code.replace(/import { useBottomTabBarPadding }.*\\n/, match => match + `import { useTabBarScroll } from '../../context/TabBarVisibilityContext';\n`);
  }

  // Add hooks if missing
  if(!code.includes('useTabBarScroll()')) {
    // try placing right after const dispatch = useDispatch();
    code = code.replace(/const dispatch = useDispatch\(\);/, match => match + `\n  const bottomPadding = useBottomTabBarPadding();\n  const { onScroll: onTabBarScroll } = useTabBarScroll();`);
  }

  // Inject props
  code = code.replace(/<ScrollView([^>]*)>/g, (match, attrs) => {
    if(attrs.includes('onScroll={onTabBarScroll}')) return match;
    return `<ScrollView${attrs} onScroll={onTabBarScroll} scrollEventThrottle={16}>`;
  });
  
  code = code.replace(/<FlatList([^>]*)>/g, (match, attrs) => {
    if(attrs.includes('onScroll={onTabBarScroll}')) return match;
    return `<FlatList${attrs} onScroll={onTabBarScroll} scrollEventThrottle={16}>`;
  });

  fs.writeFileSync(p, code);
});
console.log('Done mapping.');