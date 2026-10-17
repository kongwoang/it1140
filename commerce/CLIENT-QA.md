# Kiểm tra luồng người học

Các sửa lỗi client được kiểm tra ở cả học thử và API khóa học; không dùng trạng thái trình duyệt để cấp quyền hoặc xác nhận thanh toán.

## Các tình huống có kiểm thử

- Nhập số: dấu phẩy thập phân, số âm, dạng khoa học, chuỗi sai định dạng; lỗi nhập biến mất khi sửa. Không gửi đáp án sai định dạng để chấm thành câu sai.
- Câu nhiều đáp án: bỏ chọn hết phải trở về chưa trả lời; bản đồ câu hỏi và tiến độ cập nhật ngay, không cần chuyển câu.
- Tiếp tục học: giữ riêng vị trí của Luyện / Thi / Ôn; thứ tự đã trộn được khôi phục bằng ID. ID lưu cục bộ luôn được giao với danh sách máy chủ cho phép, không thể mở câu trả phí bằng cách sửa localStorage.
- Hủy đổi đề đang làm: khôi phục cả chế độ và chương, không ghép câu luyện tập vào bài thi cũ. Bỏ ghim trong danh sách đã ghim phải loại câu đó ngay.
- Mất mạng / phản hồi treo: tải câu hỏi hết hạn sau 20 giây, trả lại nút thao tác và có Thử lại; không tự gửi lại POST. Phản hồi cũ không ghi đè lượt tìm kiếm mới.
- OTP: chặn gửi/kiểm tra trùng khi đang chờ, đếm ngược gửi lại theo email, đổi màn hình không bỏ qua thời gian chờ. Kiểm tra phía server vẫn là nguồn quyết định.
- Đăng xuất: dữ liệu đơn và QR được xóa khỏi màn hình; phản hồi đơn, thiết bị, hoặc yêu cầu vào học về muộn không mở lại màn hình hay điều hướng cũ.
- Kiểm tra đơn: nút kiểm tra và vòng thăm dò không tạo hai yêu cầu đồng thời cho cùng đơn; không thay cách máy chủ xác nhận giao dịch.
- Phiên học: đổi tab nhanh không gửi dồn heartbeat, tối thiểu 5 giây giữa các kiểm tra do focus; heartbeat treo dừng sau 15 giây. Phiên bị chặn không tự sống lại vì phản hồi về muộn. Học thử không claim/heartbeat phiên trả phí.
- Bàn phím: liên kết Đến nội dung chỉ hiện khi focus, chuyển tới đúng câu hỏi hoặc ô Python. Nút chế độ, ghim và bản đồ câu hỏi có trạng thái đọc được bởi công cụ hỗ trợ.

## Chạy tự động

```sh
npm run build --prefix commerce
HTTP_SMOKE=true npm test --prefix commerce
npm run test:prototype --prefix commerce
node scripts/test-quiz.mjs
```

Các bài client dùng DOM/network giả, không gửi email, không tạo giao dịch thật. Kiểm thử HTTP cần quyền mở cổng localhost; kiểm thử PostgreSQL native cần cấu hình DB thử riêng như CI.

## Kiểm tra đăng nhập trên trình duyệt

Chỉ trên localhost: chạy preview với `PREVIEW_INTERACTIVE=true`. Chương trình tạo DB tạm, một tài khoản học giả và thư mục hộp thư giả có quyền riêng tư; mã được ghi vào tệp thay vì gửi email. Đọc đường dẫn hộp thư từ đầu ra tiến trình, không đưa OTP hoặc tệp hộp thư vào Git. Sau khi kiểm tra, đăng xuất và khởi động lại preview không có cờ này. Không cấu hình SMTP thật hoặc mở thanh toán cho bài kiểm tra UI.

Đã kiểm tra thủ công luồng đăng nhập giả, vào học, chặn số không hợp lệ, chấm số hợp lệ và đăng xuất. Đây không phải kết quả kiểm thử SMTP/bank webhook thực tế hay đo tải 1.000 người đồng thời.
