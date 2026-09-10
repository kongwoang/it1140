# Hướng dẫn sửa dữ liệu

## Thêm hoặc sửa bộ câu hỏi

Mỗi file trong `subjects/` là một đối tượng JSON hoàn chỉnh:

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
      "id": "co-ban-001",
      "topic": "co-ban",
      "source": "bai-1",
      "kind": "quiz",
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

## Thêm bài thực hành Python

Thêm một phần tử vào mảng `exercises` trong `python-exercises.json`. Mỗi bài gồm đề bài, mã khởi đầu, gợi ý và các phép `assert` dùng để chấm tự động. Mã kiểm tra chạy trong cùng phạm vi với mã của người học.
