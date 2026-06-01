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
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};`;

const replacement1 = `const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};`;

const target2 = `const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  )
}`;

const replacement2 = `const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
}`;

let count = 0;
walk('VettriAcademy/src/screens', (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(target1)) {
      content = content.replace(target1, replacement1);
      fs.writeFileSync(filePath, content);
      count++;
    } else if (content.includes(target2)) {
      content = content.replace(target2, replacement2);
      fs.writeFileSync(filePath, content);
      count++;
    } else if (content.includes('const { particleCount = 20, size = "small", colors, ...rest } = props;') && !content.includes('children')) {
      // Catch-all regex just in case there's slight whitespace differences
      const regex = /const TouchableOpacity = \(props\) => \{\s*const \{ particleCount = 20, size = "small", colors, \.\.\.rest \} = props;\s*return \(\s*<ParticleWrapper particleCount=\{particleCount\} size=\{size\} colors=\{colors\}>\s*<RNTouchableOpacity \{\.\.\.rest\} \/>\s*<\/ParticleWrapper>\s*\);?\s*\};?/;
      if (regex.test(content)) {
        content = content.replace(regex, replacement1);
        fs.writeFileSync(filePath, content);
        count++;
      }
    }
  }
});
console.log('Replaced in ' + count + ' files');
