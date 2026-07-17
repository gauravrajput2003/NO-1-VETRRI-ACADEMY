const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const target1 = `const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};`;

const replacement1 = `const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, style, ...rest } = props;
  let flexStyle = {};
  if (style) {
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    if (flat.flex !== undefined) flexStyle.flex = flat.flex;
    if (flat.width !== undefined) flexStyle.width = flat.width;
  }
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors} style={flexStyle}>
      <RNTouchableOpacity style={style} {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};`;

let count = 0;
walk('VettriAcademy/src/screens', (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(target1)) {
      content = content.replace(target1, replacement1);
      fs.writeFileSync(filePath, content);
      count++;
    } else {
      // Regex catch-all
      const regex = /const TouchableOpacity = \(props\) => \{\s*const \{ particleCount = 20, size = "small", colors, children, \.\.\.rest \} = props;\s*return \(\s*<ParticleWrapper particleCount=\{particleCount\} size=\{size\} colors=\{colors\}>\s*<RNTouchableOpacity \{\.\.\.rest\}>\{children\}<\/RNTouchableOpacity>\s*<\/ParticleWrapper>\s*\);\s*\};/;
      if (regex.test(content)) {
        content = content.replace(regex, replacement1);
        fs.writeFileSync(filePath, content);
        count++;
      }
    }
  }
});
console.log('Replaced flex styles in ' + count + ' files');
