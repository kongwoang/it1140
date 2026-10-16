# Hướng dẫn sửa dữ liệu

## Thêm hoặc sửa bộ câu hỏi

File `subjects/it1140.json` là ngân hàng câu hỏi chính, hiện có 2.096 câu cho 12 chương, gồm 96 câu chọn nhiều đáp án. Ma trận nội dung và ghi chú rà soát hiện tại nằm tại `QUESTION_BANK_REVIEW.md`; các file `CHUONG_*_REVIEW.md` lưu lịch sử bộ trước khi mở rộng. Cấu trúc được kiểm soát bởi `schema/subject.schema.json`:

```json
{
  "id": "ma-bo-cau-hoi",
  "code": "IT1140",
  "title": "Tên hiển thị",
  "language": "vi",
  "chapters": [
    { "id": "chuong-1", "label": "Chương 1 · Thông tin và dữ liệu" }
  ],
  "sources": [
    { "id": "bai-1", "label": "Bài 1", "type": "lecture" }
  ],
  "topics": [
    { "id": "co-ban", "label": "Kiến thức cơ bản", "chapter": "chuong-1" }
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

Với `responseType: "choice"` (mặc định nếu bỏ trường), `answer` là chỉ số bắt đầu từ `0`. Câu có nhiều đáp án dùng mảng tăng dần gồm 2–3 chỉ số trong bốn lựa chọn, ví dụ `"answer": [0, 2]`, và đề phải ghi “Chọn tất cả đáp án đúng.” Giao diện tự dùng checkbox. Chỉ chấm đúng khi chọn đủ và không chọn thừa; thứ tự bấm không ảnh hưởng kết quả.

Với `responseType: "number"`, dùng `choices: []` và `answer` là giá trị số JSON, ví dụ `-46` hoặc `45.625`. Câu hỏi phải nêu đơn vị và hệ đếm cần trả lời; nếu kết quả vô hạn phải chọn câu khác hoặc quy định làm tròn rõ ràng. Web chấm bằng giá trị số chính xác, không có sai số dung sai; chấp nhận dấu phẩy hoặc dấu chấm thập phân, số âm, ký pháp khoa học. Không nhận biểu thức, phân số dạng `1/2`, đơn vị hay dấu phân cách hàng nghìn. Tiến độ và chuỗi người học nhập chỉ lưu ở localStorage.

Giao diện chỉ phân loại theo `chapters`. Mỗi phần tử `topics` phải có `chapter` trỏ tới một ID trong `chapters`; `topics` và `sources` vẫn là thông tin biên soạn nội bộ, không xuất hiện dưới dạng bộ lọc hoặc nhãn nguồn/chủ đề nhỏ trên giao diện.

Khi thêm chương vào cùng bộ, nối thêm chương, nguồn, chủ đề và câu hỏi; giữ nguyên ID câu cũ để không mất liên kết tiến độ. Không ghi đè toàn bộ ngân hàng bằng JSON chỉ có chương mới.

Sửa nội dung trực tiếp trong JSON. Thư mục `scripts/question-bank-authoring/` lưu quyết định biên tập và mã của đợt mở rộng một lần, không phải lệnh cần chạy trước mỗi lần phát hành. `build.mjs` chủ động từ chối chạy lại trên bộ đã mở rộng để không ghi đè các sửa đổi về sau.

### Trình bày mã và ngữ cảnh độc lập

Trong `prompt`, `choices`, `explanation` và phần `task`/`hint` của bài Python:

- Dùng một cặp backtick cho mã nội dòng, ví dụ chuỗi JSON ``"Gọi `len(a)` để đếm phần tử."``.
- Dùng rào ba backtick trên dòng riêng cho chương trình, thêm `python` ở dòng mở; mã giả hoặc dữ liệu dùng `text`. Trong JSON, xuống dòng vẫn viết bằng `\n`. Không dùng thẻ HTML.
- Giữ nguyên thụt lề và dòng trống trong chương trình. Khối mã có thể nằm giữa hai đoạn văn; câu hỏi sau khối mã vẫn hiển thị như văn bản.
- `kind: "code"` dành cho câu đọc mã; toàn bộ đầu ra trong các lựa chọn dùng font monospace. Câu hỏi lý thuyết/tính toán có lựa chọn xen lời văn và mã thì chỉ đánh dấu phần mã.
- Nêu đầy đủ biến, kiểu dữ liệu, khởi tạo, hàm và quy ước mà người học cần biết; nói rõ các lựa chọn được xét riêng hay nối tiếp. Không dùng “cùng ví dụ trên” thay cho dữ kiện.

`scripts/format-question-content.mjs` hỗ trợ thêm dấu trình bày vào nội dung có sẵn, kiểm tra văn bản sau khi bỏ dấu không thay đổi. Đây chỉ là công cụ định dạng, không thay việc duyệt nội dung. `scripts/test-question-content.mjs` kiểm tra bộ hiển thị, khối mã khớp ca chạy thật và các câu đã sửa ngữ cảnh.

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

Mục “Tệp dữ liệu mẫu” hiển thị tên và nội dung `files` của ca đầu tiên, đúng các tệp được nạp khi bấm “Chạy input này”. Không hiển thị nội dung `expectedFiles` như dữ liệu vào.

Các bài hiện tại được lấy theo `IT1140_Tai_lieu_Giang_vien.pdf` và chia theo trường `section`. Chạy lệnh sau để kiểm tra schema trước khi đưa lên GitHub:

```bash
node scripts/validate-data.mjs
```
