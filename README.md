# Tin học đại cương – IT1140

Website ôn tập tĩnh, giao diện và ngân hàng câu hỏi tiếng Việt dành cho môn Tin học đại cương (IT1140). Trang gồm hai khu vực: ôn câu hỏi trắc nghiệm và thực hành Python trực tiếp trên trình duyệt.

## Tổ chức nội dung

```text
data/
├── manifest.json                 # Danh mục các bộ câu hỏi
├── python-exercises.json         # Bài thực hành Python và bộ kiểm tra
├── schema/subject.schema.json    # Quy ước dữ liệu máy đọc được
└── subjects/
    └── it1140.json               # Ngân hàng câu hỏi IT1140
```

Mỗi bộ câu hỏi chứa `chapters`, `sources`, `topics` và `questions`. Giao diện chỉ phân loại theo chương; nguồn và nhóm kiến thức được giữ trong JSON để biên tập, đối chiếu tài liệu. Mỗi nhóm kiến thức có `chapter`, mỗi câu có `source` và `topic`.

Dùng [PROMPT_TAO_CAU_HOI.md](./PROMPT_TAO_CAU_HOI.md) để yêu cầu một LLM khác tạo đúng định dạng JSON. Ngân hàng hiện có **284 câu**: chương 1 có 124 câu, chương 2 có 160 câu. Xem ma trận nội dung và các điểm đã đối chiếu tại [chương 1](./data/CHUONG_1_REVIEW.md) và [chương 2](./data/CHUONG_2_REVIEW.md).

## Lưu trữ dữ liệu

- Câu trả lời, tiến độ, câu đã ghim và thứ tự trộn được lưu bằng `localStorage` trên trình duyệt.
- Mã Python đang viết và bài đã hoàn thành cũng được lưu bằng `localStorage`.
- Bộ khung trang được lưu bằng Cache API thông qua service worker để có thể mở lại khi mất mạng.
- Website không dùng máy chủ ứng dụng và không có cơ sở dữ liệu.

## Thực hành Python

Môi trường Python chạy trong Web Worker bằng Pyodide để mã lỗi hoặc chạy quá lâu không làm treo toàn bộ giao diện. Các bài tập hiện có bao phủ Python cơ bản, `math`, `statistics`, `random`, `collections`, NumPy, pandas và Matplotlib. Lần chạy đầu cần mạng để tải môi trường Python; trình duyệt sẽ lưu các tệp tải về vào bộ nhớ đệm.

## Phát hành trên GitHub Pages

Đẩy mã nguồn lên nhánh `main`, sau đó trong **Settings → Pages → Build and deployment**, chọn **GitHub Actions**. Workflow có sẵn sẽ phát hành website và file `CNAME` cấu hình tên miền `it1140.hoangpc.io.vn`.
