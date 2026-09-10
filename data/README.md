# Hướng dẫn sửa dữ liệu

## Thêm hoặc sửa bộ câu hỏi

File `subjects/it1140.json` là ngân hàng câu hỏi chính. Toàn bộ dữ liệu cũ đã được xóa để chờ nội dung IT1140 mới. Cấu trúc được kiểm soát bởi `schema/subject.schema.json`:

```json
{
  "id": "ma-bo-cau-hoi",
  "code": "IT1140",
  "title": "Tên hiển thị",
  "language": "vi",
  "sources": [
    { "id": "bai-1", "label": "Bài 1", "type": "lecture" }
  ],
  "topics": [
    { "id": "co-ban", "label": "Kiến thức cơ bản" }
  ],
  "questions": [
    {
      "id": "it1140-co-ban-001",
      "topic": "co-ban",
      "source": "bai-1",
      "kind": "theory",
      "difficulty": 1,
      "prompt": "Nội dung câu hỏi?",
      "choices": ["Lựa chọn A", "Lựa chọn B"],
      "answer": 0,
      "explanation": "Giải thích đáp án.",
      "tags": ["từ khóa"]
    }
  ]
}
```

`answer` là chỉ số bắt đầu từ `0`. Câu có nhiều đáp án dùng mảng, ví dụ `"answer": [0, 2]`.

Khi thêm một file bộ câu hỏi mới, khai báo file đó trong `manifest.json`. Chạy lệnh sau để kiểm tra trước khi đưa lên GitHub:

```bash
node scripts/validate-data.mjs
```

Prompt dùng để sinh dữ liệu bằng LLM nằm tại `PROMPT_TAO_CAU_HOI.md` ở thư mục gốc.

## Thêm bài thực hành Python

Thêm một phần tử vào mảng `exercises` trong `python-exercises.json`. Mỗi bài gồm đề bài, mã khởi đầu, gợi ý và các phép `assert` dùng để chấm tự động. Mã kiểm tra chạy trong cùng phạm vi với mã của người học.

Các bài hiện tại được biên soạn từ `IT1140_Tai_lieu_Giang_vien.pdf` và chia theo trường `section` để danh sách trên giao diện dễ theo dõi. Bài xử lý tệp nhận nội dung mẫu dưới dạng chuỗi để chạy được trong website tĩnh; khi thực hành ngoài trình duyệt có thể thay phần dữ liệu mẫu bằng `open(...)`. Các bài Turtle được chuyển sang bài tọa độ/Matplotlib tương đương để vẫn xem và kiểm tra kết quả trong trình duyệt.
