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

Dùng [PROMPT_TAO_CAU_HOI.md](./PROMPT_TAO_CAU_HOI.md) để yêu cầu một LLM khác tạo đúng định dạng JSON. Ngân hàng hiện có **2.096 câu**, trong đó **96 câu chọn nhiều đáp án**, cho 12 chương: lần lượt **208, 208, 248, 218, 118, 158, 158, 158, 158, 208, 128, 128** câu. Xem [ma trận và đợt rà soát hiện tại](./data/QUESTION_BANK_REVIEW.md). Các ghi chú [chương 1](./data/CHUONG_1_REVIEW.md), [chương 2](./data/CHUONG_2_REVIEW.md), [chương 3](./data/CHUONG_3_REVIEW.md), [chương 4](./data/CHUONG_4_REVIEW.md) và [chương 5–12](./data/CHUONG_5_12_REVIEW.md) giữ lịch sử đối chiếu của bộ 1.140 câu trước khi mở rộng.

## Kiểm chứng câu hỏi

```sh
node scripts/validate-data.mjs
node scripts/test-quiz.mjs
python -m pip install numpy==2.2.6
python scripts/test-python-quiz.py
python scripts/test-question-calculations.py
```

Python 3.10+ cần thiết cho các ví dụ `match/case` (CI dùng 3.12). Bộ **776 fixture** trong `scripts/fixtures/python-quiz-cases.json` chạy đúng đoạn mã hiển thị và so với đáp án trong ngân hàng; **171 phép kiểm chứng số học/thuật toán** riêng nằm trong `scripts/fixtures/question-bank-calculations.json`. Khi sửa câu đọc mã, sửa cả fixture tương ứng; không đưa mã từ nguồn không tin cậy vào bộ kiểm thử này. Website vẫn là tĩnh, không cần Python phía máy chủ; các công cụ này chỉ chạy khi kiểm thử/phát hành. Câu Turtle là câu ôn tập, không bổ sung Tk vào môi trường thực hành trên trình duyệt.

## Lưu trữ dữ liệu

- Câu trả lời, tiến độ, câu đã ghim và thứ tự trộn được lưu bằng `localStorage` trên trình duyệt.
- Mã Python đang viết và bài đã hoàn thành cũng được lưu bằng `localStorage`.
- Bộ khung trang được lưu bằng Cache API thông qua service worker để có thể mở lại khi mất mạng.
- Website không dùng máy chủ ứng dụng và không có cơ sở dữ liệu.

## Thực hành Python

Môi trường Python chạy trong Web Worker bằng Pyodide để mã lỗi hoặc chạy quá lâu không làm treo toàn bộ giao diện. Các bài tập hiện có bao phủ Python cơ bản, `math`, `statistics`, `random`, `collections`, NumPy, pandas và Matplotlib. Lần chạy đầu cần mạng để tải môi trường Python; trình duyệt sẽ lưu các tệp tải về vào bộ nhớ đệm.

## Phát hành trên GitHub Pages

Đẩy mã nguồn lên nhánh `main`, sau đó trong **Settings → Pages → Build and deployment**, chọn **GitHub Actions**. Workflow có sẵn sẽ phát hành website và file `CNAME` cấu hình tên miền `it1140.hoangpc.io.vn`.
