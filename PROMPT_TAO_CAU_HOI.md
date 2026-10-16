# Prompt tạo ngân hàng câu hỏi IT1140

Sao chép toàn bộ nội dung trong khối dưới đây và thay các phần nằm giữa `{{...}}`.

```text
Bạn là chuyên gia biên soạn ngân hàng câu hỏi cho môn Tin học đại cương, mã học phần IT1140. Hãy chuyển tài liệu nguồn tôi cung cấp thành đúng MỘT đối tượng JSON tương thích với website của tôi.

THÔNG TIN ĐẦU VÀO
- Số câu mong muốn: {{SO_LUONG_CAU}}
- Mã chương: {{CHAPTER_ID_KEBAB_CASE}} (ví dụ chuong-1)
- Tên chương trên giao diện: {{TEN_CHUONG}} (ví dụ Chương 1 · Thông tin và dữ liệu)
- Mã nguồn tài liệu: {{SOURCE_ID_KEBAB_CASE}}
- Tên nguồn dùng để biên soạn (không hiển thị thành bộ lọc): {{TEN_NGUON}}
- Loại nguồn: {{LOAI_NGUON}} (chỉ chọn một trong: lecture, textbook, exam, quiz, reference)
- Các chủ đề được phép dùng, định dạng "id: tên":
{{DANH_SACH_CHU_DE}}

TÀI LIỆU NGUỒN
--- BẮT ĐẦU TÀI LIỆU ---
{{DAN_NOI_DUNG_BAI_GIANG_GIAO_TRINH_VAO_DAY}}
--- KẾT THÚC TÀI LIỆU ---

YÊU CẦU NỘI DUNG
1. Chỉ sử dụng kiến thức có trong tài liệu nguồn. Không tự bịa dữ kiện, định nghĩa, số liệu hoặc đáp án. Nếu tài liệu không đủ để tạo số câu yêu cầu, hãy tạo ít câu hơn.
2. Bám cách dùng từ và cách nêu yêu cầu của đề cương/tài liệu nguồn. Viết tiếng Việt tự nhiên, đầy đủ chủ ngữ và vị ngữ; đặt dữ kiện trước rồi hỏi trực tiếp điều cần xác định. Không viết kiểu ghi chú rút gọn như “bản Euclid kiểm tra r=0 trước cập nhật”, “cặp giá trị giải mã; trạng thái” hoặc “phát biểu nào thận trọng”. Chỉ giữ tên riêng, cú pháp lệnh và thuật ngữ tiếng Anh khi cần; giải nghĩa ngay trong câu nếu người mới học có thể chưa biết.
3. Mỗi câu phải độc lập, không tham chiếu “câu trên”, “hình trên” hoặc vị trí trong tài liệu nếu hình/nội dung đó không nằm ngay trong câu hỏi.
4. Không tạo hai câu kiểm tra cùng một ý bằng cách diễn đạt lại.
5. Câu trắc nghiệm (responseType = "choice") có 4 lựa chọn. Các lựa chọn phải cùng kiểu ngữ pháp, tương đương về độ dài và hợp lý; dùng sai lầm thường gặp làm phương án nhiễu, không để đáp án đúng nổi bật vì dài hơn, chi tiết hơn hoặc khác kiểu.
6. Kết hợp câu một đáp án, điền số và nhiều đáp án theo nội dung. Câu nhiều đáp án có 2–3 đáp án đúng trong bốn lựa chọn và ghi rõ “Chọn tất cả đáp án đúng.” Không tiết lộ số đáp án đúng; từng lựa chọn phải đúng/sai độc lập, không phụ thuộc lựa chọn khác. Dùng mảng chỉ số tăng dần, không lặp. Chỉ chấm đúng khi chọn đủ, không chọn thừa. Ưu tiên dạng này cho đặc điểm, điều kiện, cách sửa lỗi và ca kiểm tra; không ép câu tính một giá trị thành nhiều đáp án.
7. Không dùng lựa chọn “Tất cả đáp án trên”, “Cả A và B” hoặc “Không có đáp án nào”.
8. Không dùng chữ cái A/B/C/D trong nội dung lựa chọn. Website tự đánh chữ cái.
9. Phân bố vị trí đáp án đúng tương đối đều, không luôn đặt ở chỉ số 0.
10. explanation phải giải thích ngắn gọn vì sao đáp án đúng dựa trên tài liệu; không chỉ lặp lại đáp án.
11. difficulty: 1 = nhận biết, 2 = hiểu/vận dụng trực tiếp, 3 = suy luận hoặc vận dụng nhiều bước.
12. kind chỉ nhận một trong: theory, calculation, code, application.
13. tags gồm 1–6 từ khóa ngắn, hữu ích cho tìm kiếm.
14. Dùng responseType = "number" khi điền một số giúp kiểm tra tính toán tốt hơn đoán lựa chọn: choices = [], answer là một số JSON hữu hạn (không phải chuỗi, không phải chỉ số). Đề phải nêu hệ đếm, đơn vị, quy ước và yêu cầu làm tròn nếu cần. Website chấm chính xác theo giá trị, không có dung sai; ưu tiên kết quả nguyên hoặc thập phân hữu hạn. Không dùng dạng này cho chuỗi bit có số 0 đầu, mã hex hoặc nhiều giá trị.
15. Lập ma trận nội dung trước khi sinh để phủ mọi mục kiến thức, không dành quá nhiều câu cho một mục. Ghi trang nguồn trong explanation nếu tài liệu có số trang. Nếu slide có lỗi, đối chiếu nguồn chuẩn, giải thích đính chính; không sao chép đáp án sai. Không đưa lời giải hay dấu hiệu đáp án vào prompt.
16. Mỗi câu chỉ hỏi một yêu cầu chính. Tách điều kiện dài thành câu hoặc dòng riêng. Không dùng “URL trên”, “theo cách dựng trên”, “cùng ví dụ trước” khi dữ kiện đó không có ngay trong câu; ghi lại đầy đủ URL, công thức hoặc quy trình cần thiết.
17. Với câu đọc mã, giữ đúng mã, thụt lề, dấu nháy và escape. Hỏi rõ nội dung được in ra, giá trị biến hay số lần lặp. Với mã giả, nêu quy ước cận vòng lặp và cách đánh số phần tử; không trộn mã giả rút gọn vào một câu văn dài.
18. Đọc lại cả đề và từng lựa chọn như khi đọc thành tiếng. Các lựa chọn phải trả lời đúng kiểu câu hỏi: hỏi “điều gì” thì không mở đầu mọi lựa chọn bằng “Có/Không”; hỏi một giá trị thì ghi giá trị hoặc câu trả lời thống nhất. Diễn đạt lại điều kiện của tài liệu cho rõ, không tự bỏ điều kiện hoặc đổi dữ kiện để câu ngắn hơn.
19. Phân loại độ khó theo công việc người học thực sự phải làm: Dễ = nhận biết/tra một quy tắc quen thuộc; Vừa = hiểu và vận dụng trực tiếp; Khó = phối hợp các quy tắc, theo dõi trạng thái nhiều bước hoặc tìm phản ví dụ. Đề dài, thuật ngữ lạ và chọn nhiều đáp án không tự làm câu thành Khó. Nếu cần một quy tắc Python/thư viện chưa được giảng, cung cấp quy tắc trong đề hoặc bỏ chi tiết đó, không dùng làm bẫy.
20. Đa dạng hóa nhiệm vụ: tìm lỗi, chọn cách sửa, chọn ca kiểm tra, tìm phản ví dụ, xử lý biên/rỗng/trùng, đọc mã, giải thích nguyên nhân và tính toán. Không nhân hàng loạt câu chỉ bằng thay số. Nếu dùng một mẫu với tối đa ba bộ dữ liệu, mỗi bộ phải kiểm tra một điều kiện có ý nghĩa khác nhau; ưu tiên thêm dạng nhiệm vụ mới.
21. Với phương án nhiễu, dùng các nhầm lẫn trong cùng miền kiến thức; không đặt một thuật ngữ đúng cạnh ba lựa chọn không liên quan. Không tạo mẹo “chọn phát biểu dài nhất/thận trọng nhất”; nhưng cũng không kéo dài câu sai vô nghĩa chỉ để cân bằng số ký tự. Khi tham khảo đề công khai, chỉ học dạng bài và tự biên soạn dữ kiện/lời giải, ghi nguồn tham khảo trong tài liệu biên tập. Không coi chương trình học cũ hoặc đáp án Internet là đúng mặc định.
22. Mỗi câu phải có đủ kiểu/giá trị biến, trạng thái khởi tạo, dữ liệu tệp hoặc định nghĩa hàm/thuật toán mà lời giải cần dùng. Với câu tìm phản ví dụ, mô tả đầy đủ phần khởi tạo, bước cập nhật và giá trị trả về; không chỉ nói tên lỗi. Nêu rõ các lựa chọn được xét độc lập hay thực hiện nối tiếp. Không mặc định dùng dữ kiện của câu trước. Quy tắc thư viện ngoài phần đã giảng (cận bin histogram, IQR, mặc định của API…) cần được nêu trong đề nếu không phải chính kiến thức cần kiểm tra.
23. Định dạng mã ngay trong chuỗi JSON: mã nội dòng đặt giữa một cặp dấu backtick; chương trình nhiều dòng đặt giữa hai dòng rào ba backtick, dòng mở ghi python hoặc text cho mã giả. Dùng \n cho xuống dòng trong JSON, giữ nguyên khoảng trắng thụt lề. Chỉ đánh dấu phần mã, không biến cả câu văn thành mã. Áp dụng cho prompt, choices và explanation. Website chỉ hỗ trợ hai kiểu đánh dấu này, không hỗ trợ HTML/Markdown tùy ý. Không thêm trường JSON mới để trình bày mã.

QUY TẮC ID VÀ THAM CHIẾU
- id của bộ luôn là "it1140".
- Mọi id dùng chữ thường không dấu, số và dấu gạch ngang; không có khoảng trắng.
- id câu hỏi có dạng "it1140-{topic-id}-{nnn}", ví dụ "it1140-he-dieu-hanh-001".
- topic của mỗi câu phải trùng đúng một id có trong topics.
- chapter của mỗi chủ đề phải bằng {{CHAPTER_ID_KEBAB_CASE}} và tham chiếu một phần tử trong chapters. Website chỉ hiển thị và lọc theo chương; chủ đề nhỏ/nguồn được giữ nội bộ để biên soạn.
- source của mọi câu phải bằng đúng {{SOURCE_ID_KEBAB_CASE}}.
- Không được trùng id câu hỏi trong cùng file.
- Với responseType = "choice", answer là CHỈ SỐ bắt đầu từ 0: lựa chọn đầu tiên là 0, lựa chọn thứ hai là 1. Với nhiều đáp án, dùng mảng tăng dần như [0, 2]. Với responseType = "number", answer là GIÁ TRỊ cần điền.

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC
- Chỉ trả về JSON hợp lệ, bắt đầu bằng { và kết thúc bằng }.
- Không đặt JSON trong khối Markdown, không thêm lời dẫn, nhận xét hoặc chú thích.
- Không dùng comment và không có dấu phẩy thừa.
- Dùng đúng cấu trúc sau; không thêm hoặc bỏ trường:

{
  "$schema": "../schema/subject.schema.json",
  "id": "it1140",
  "code": "IT1140",
  "title": "Tin học đại cương",
  "language": "vi",
  "chapters": [
    {
      "id": "{{CHAPTER_ID_KEBAB_CASE}}",
      "label": "{{TEN_CHUONG}}"
    }
  ],
  "sources": [
    {
      "id": "{{SOURCE_ID_KEBAB_CASE}}",
      "label": "{{TEN_NGUON}}",
      "type": "{{LOAI_NGUON}}"
    }
  ],
  "topics": [
    {
      "id": "topic-id",
      "chapter": "{{CHAPTER_ID_KEBAB_CASE}}",
      "label": "Tên chủ đề tiếng Việt"
    }
  ],
  "questions": [
    {
      "id": "it1140-topic-id-001",
      "topic": "topic-id",
      "source": "{{SOURCE_ID_KEBAB_CASE}}",
      "kind": "theory",
      "difficulty": 1,
      "responseType": "choice",
      "prompt": "Nội dung câu hỏi?",
      "choices": [
        "Lựa chọn thứ nhất",
        "Lựa chọn thứ hai",
        "Lựa chọn thứ ba",
        "Lựa chọn thứ tư"
      ],
      "answer": 0,
      "explanation": "Giải thích ngắn gọn, chính xác dựa trên tài liệu nguồn.",
      "tags": ["từ khóa 1", "từ khóa 2"]
    }
  ]
}

TRƯỚC KHI TRẢ KẾT QUẢ
Hãy tự kiểm tra âm thầm từng câu: người học có hiểu yêu cầu khi chỉ đọc riêng câu này không; câu văn có tự nhiên và bám cách dùng từ trong tài liệu không; các dữ kiện và định dạng mã có đầy đủ không; JSON hợp lệ; id duy nhất; topic/source tồn tại; với choice, chỉ mục answer nằm trong choices; với number, choices rỗng và answer là giá trị số; tự tính lại mọi đáp án; đáp án được tài liệu hỗ trợ; không có câu trùng ý; giải thích không phụ thuộc thứ tự lựa chọn; không có nội dung tiếng Anh không cần thiết. Chỉ xuất JSON cuối cùng, không xuất checklist.
```
