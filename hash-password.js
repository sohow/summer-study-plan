import bcrypt from 'bcrypt';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('请输入您要设置的登录密码: ', (password) => {
  if (!password) {
    console.error('密码不能为空！');
    rl.close();
    return;
  }

  // 使用 bcrypt 对密码进行哈希处理
  // 10 是 salt rounds，数值越高越安全，但计算时间也越长
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error('生成哈希失败:', err);
    } else {
      console.log('\n✅ 密码哈希生成成功！');
      console.log('请将下面的哈希值完整复制到您的 .env 文件中的 PASSWORD_HASH 变量：');
      console.log(`\nPASSWORD_HASH="${hash}"\n`);
    }
    rl.close();
  });
});