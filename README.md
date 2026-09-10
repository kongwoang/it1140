# Tin học đại cương – IT1140

Website ôn tập tĩnh, giao diện và ngân hàng câu hỏi tiếng Việt dành cho môn Tin học đại cương (IT1140).

## Lưu trữ dữ liệu

- Câu trả lời, tiến độ, câu đã ghim và thứ tự trộn được lưu bằng `localStorage` trên trình duyệt.
- Bộ khung trang được lưu bằng Cache API thông qua service worker để có thể mở lại khi mất mạng.
- Website không dùng máy chủ ứng dụng và không có cơ sở dữ liệu.

## Phát hành trên GitHub Pages

Đẩy mã nguồn lên nhánh `main`, sau đó trong **Settings → Pages → Build and deployment**, chọn **GitHub Actions**. Workflow có sẵn sẽ phát hành website và file `CNAME` cấu hình tên miền `it1140.hoangpc.io.vn`.
