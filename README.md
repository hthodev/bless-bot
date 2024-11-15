## Cài đặt

1. Clone source code:
   ```bash
   git clone https://github.com/hthodev/bless-bot.git
	```

2. Cd tới thư mục lưu
	```bash
	cd blockless-bless-network-bot
	```

3. Cài đặt package:
	```bash
	npm install
	```

## Cách sử dụng
1. Nếu chưa có tài khoản, click vào đây để đăng ký, giúp tôi ủng hộ 1ref [here](https://bless.network/dashboard?ref=WMWX3M).

2. Cấu hình và chỉnh sửa file user.txt. Dưới đây là cách thiết lập file này, đặt `B7S_AUTH_TOKEN` của bạn vào file text. Ví dụ: Để lấy token, thực hiện các bước sau:

- Đăng nhập vào tài khoản của bạn tại https://bless.network/dashboard, đảm bảo bạn đang ở đường dẫn này trước khi thực hiện bước tiếp theo.
- Mở Inspect Element, nhấn F12 hoặc chuột phải và chọn Inspect Element trên trình duyệt.
- Vào tab Console và dán dòng lệnh sau:
 	```bash
	localStorage.getItem('B7S_AUTH_TOKEN')
	```

3. Cấu hình và chỉnh sửa file id.txt. Dưới đây là cách thiết lập file này, đặt nodeid(pubkey) và hardwareid vào file text với định dạng nodeid(pubkey):hardwareid

Để lấy nodeid và hardwareid
- Tải xuống extension
- Sau khi tải, mở `chrome://extensions/?id=pljbjcehnhcnofmkdbjolghdcjnmekia`.
- Bật `Developer mode` ở góc trên bên phải, sau đó nhấn vào `Service Worker`. Một tab mới sẽ mở ra.
![Donate](https://github.com/user-attachments/assets/63151405-cd49-4dff-9eec-a787a9aa3144)
- Chuyển qua tab Network
- Từ api 12D3***************, vào tab response copy pubKey và hardware

4. Nếu muốn sử dụng proxy, chỉnh sửa file proxy.txt và thêm proxy của bạn vào đó. Đảm bảo tổng số proxy trùng với tổng số nodeid(pubkey):hardwareid trong id.txt.

5. Run code
	```bash
	npm start
	```
Note: 1 tài khoản chỉ có thể sử dụng tối đa 5 nodes

## Ủng hộ có thể ck qua
![Donate](https://github.com/hthodev/nodepay/blob/main/momo_donate_me.jpg?raw=true)