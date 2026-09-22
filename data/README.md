# Hướng dẫn sửa dữ liệu

## Thêm hoặc sửa bộ câu hỏi

File `subjects/it1140.json` là ngân hàng câu hỏi chính, hiện có 100 câu chương 1 (80 trắc nghiệm, 20 điền số). Ma trận nội dung và ghi chú rà soát nằm tại `CHUONG_1_REVIEW.md`. Cấu trúc được kiểm soát bởi `schema/subject.schema.json`:

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

Với `responseType: "choice"` (mặc định nếu bỏ trường), `answer` là chỉ số bắt đầu từ `0`. Câu có nhiều đáp án dùng mảng, ví dụ `"answer": [0, 2]`.

Với `responseType: "number"`, dùng `choices: []` và `answer` là giá trị số JSON, ví dụ `-46` hoặc `45.625`. Câu hỏi phải nêu đơn vị và hệ đếm cần trả lời; nếu kết quả vô hạn phải chọn câu khác hoặc quy định làm tròn rõ ràng. Web chấm bằng giá trị số chính xác, không có sai số dung sai; chấp nhận dấu phẩy hoặc dấu chấm thập phân, số âm, ký pháp khoa học. Không nhận biểu thức, phân số dạng `1/2`, đơn vị hay dấu phân cách hàng nghìn. Tiến độ và chuỗi người học nhập chỉ lưu ở localStorage.

Khi thêm chương vào cùng bộ, nối thêm nguồn, chủ đề và câu hỏi; giữ nguyên ID câu cũ để không mất liên kết tiến độ. Không ghi đè toàn bộ ngân hàng bằng JSON chỉ có chương mới.

Khi thêm một file bộ câu hỏi mới, khai báo file đó trong `manifest.json`. Chạy lệnh sau để kiểm tra trước khi đưa lên GitHub:

```bash
node scripts/validate-data.mjs
```

Prompt dùng để sinh dữ liệu bằng LLM nằm tại `PROMPT_TAO_CAU_HOI.md` ở thư mục gốc.

## Thêm bài thực hành Python

Thêm một phần tử vào mảng `exercises` trong `python-exercises.json`. Người học tự viết chương trình trong ô soạn thảo; dữ liệu bài không chứa mã mẫu để tránh biến phần thực hành thành bài chép lại.

Mỗi ca kiểm thử có dạng:

```json
{
  "label": "Ca 1 theo tài liệu",
  "input": "37\n",
  "output": "98.60\n"
}
```

Với bài đọc/ghi tệp, thêm `files` để tạo tệp đầu vào và `expectedFiles` để kiểm tra tệp đầu ra. Với bài đồ họa Matplotlib, dùng `checks` để kiểm tra đối tượng biểu đồ và ảnh đã lưu. Bài không thể chạy trong trình duyệt (hiện là Turtle) đặt `browserRunnable: false` và `tests: []`; giao diện sẽ hướng dẫn người học chạy chương trình trên máy.

Các bài hiện tại được lấy theo `IT1140_Tai_lieu_Giang_vien.pdf` và chia theo trường `section`. Chạy lệnh sau để kiểm tra schema trước khi đưa lên GitHub:

```bash
node scripts/validate-data.mjs
```
