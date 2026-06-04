/**
 * Script lấy OneDrive Refresh Token mới qua Device Code Flow
 * Chạy: npx ts-node get-onedrive-token.ts
 * Hoặc: node --loader ts-node/esm get-onedrive-token.ts
 */

const CLIENT_ID = '5244fb5c-e279-450d-b49f-53f8b07c2b2f';
const TENANT_ID = 'common';
const SCOPE = 'Files.ReadWrite Files.ReadWrite.All offline_access User.Read';

async function main() {
  console.log('\n🔑 Lấy OneDrive Token mới qua Device Code Flow\n');

  // Bước 1: Yêu cầu device code
  const deviceCodeRes = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/devicecode`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        scope: SCOPE,
      }).toString(),
    }
  );

  const deviceData = await deviceCodeRes.json() as any;

  if (!deviceCodeRes.ok) {
    console.error('❌ Lỗi:', deviceData);
    process.exit(1);
  }

  // Bước 2: Hiện hướng dẫn cho user
  console.log('=' .repeat(60));
  console.log('📋 HƯỚNG DẪN:');
  console.log('');
  console.log('1. Mở trình duyệt, vào URL này:');
  console.log('   👉', deviceData.verification_uri);
  console.log('');
  console.log('2. Nhập mã này:');
  console.log('   🔢', deviceData.user_code);
  console.log('');
  console.log('3. Đăng nhập bằng tài khoản Microsoft có OneDrive');
  console.log('   (tài khoản đang lưu ảnh công nhân)');
  console.log('');
  console.log('4. Nhấn "Accept" để cấp quyền Files.ReadWrite');
  console.log('=' .repeat(60));
  console.log('\n⏳ Đang chờ bạn xác nhận...\n');

  // Bước 3: Poll cho đến khi có token
  const interval = (deviceData.interval || 5) * 1000;
  const expiresAt = Date.now() + (deviceData.expires_in || 900) * 1000;

  while (Date.now() < expiresAt) {
    await new Promise(r => setTimeout(r, interval));

    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceData.device_code,
        }).toString(),
      }
    );

    const tokenData = await tokenRes.json() as any;

    if (tokenData.access_token) {
      // ✅ Thành công!
      console.log('\n✅ Lấy token thành công!\n');
      console.log('=' .repeat(60));
      console.log('🔄 REFRESH TOKEN MỚI (copy toàn bộ):');
      console.log('');
      console.log(tokenData.refresh_token);
      console.log('');
      console.log('=' .repeat(60));
      console.log('\n📋 Bước tiếp theo:');
      console.log('1. Vào Supabase SQL Editor, chạy lệnh:');
      console.log('');
      console.log(`INSERT INTO settings (key, value, updated_at)`);
      console.log(`VALUES ('onedrive_refresh_token', '${tokenData.refresh_token.substring(0, 30)}...', NOW())`);
      console.log(`ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`);
      console.log('');
      console.log('(Thay ... bằng token đầy đủ bên trên)');
      console.log('\n2. Cập nhật ONEDRIVE_REFRESH_TOKEN trên Vercel');
      console.log('   bằng token mới này\n');
      process.exit(0);
    }

    if (tokenData.error === 'authorization_pending') {
      process.stdout.write('.');
      continue;
    }

    if (tokenData.error === 'slow_down') {
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    // Lỗi khác
    console.error('\n❌ Lỗi:', tokenData.error, '-', tokenData.error_description);
    process.exit(1);
  }

  console.error('\n❌ Hết thời gian chờ. Chạy lại script.');
  process.exit(1);
}

main().catch(console.error);
