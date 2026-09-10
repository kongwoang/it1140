# Prompt tạo ngân hàng câu hỏi IT1140

Sao chép toàn bộ nội dung trong khối dưới đây và thay các phần nằm giữa `{{...}}`.

```text
Bạn là chuyên gia biên soạn ngân hàng câu hỏi cho môn Tin học đại cương, mã học phần IT1140. Hãy chuyển tài liệu nguồn tôi cung cấp thành đúng MỘT đối tượng JSON tương thích với website của tôi.

THÔNG TIN ĐẦU VÀO
- Số câu mong muốn: {{SO_LUONG_CAU}}
- Mã nguồn tài liệu: {{SOURCE_ID_KEBAB_CASE}}
- Tên nguồn hiển thị: {{TEN_NGUON}}
- Loại nguồn: {{LOAI_NGUON}} (chỉ chọn một trong: lecture, textbook, exam, quiz, reference)
- Các chủ đề được phép dùng, định dạng "id: tên":
{{DANH_SACH_CHU_DE}}

TÀI LIỆU NGUỒN
--- BẮT ĐẦU TÀI LIỆU ---
{{DAN_NOI_DUNG_BAI_GIANG_GIAO_TRINH_VAO_DAY}}
--- KẾT THÚC TÀI LIỆU ---

YÊU CẦU NỘI DUNG
1. Chỉ sử dụng kiến thức có trong tài liệu nguồn. Không tự bịa dữ kiện, định nghĩa, số liệu hoặc đáp án. Nếu tài liệu không đủ để tạo số câu yêu cầu, hãy tạo ít câu hơn.
2. Viết hoàn toàn bằng tiếng Việt rõ ràng. Chỉ giữ tên riêng, cú pháp lệnh và thuật ngữ kỹ thuật tiếng Anh khi thực sự cần thiết; lần xuất hiện đầu tiên nên có giải nghĩa tiếng Việt nếu phù hợp.
3. Mỗi câu phải độc lập, không tham chiếu “câu trên”, “hình trên” hoặc vị trí trong tài liệu nếu hình/nội dung đó không nằm ngay trong câu hỏi.
4. Không tạo hai câu kiểm tra cùng một ý bằng cách diễn đạt lại.
5. Mỗi câu có từ 2 đến 6 lựa chọn. Các lựa chọn phải cùng kiểu ngữ pháp, tương đương về độ dài và hợp lý; tránh đáp án gây nhiễu vô nghĩa.
6. Mặc định chỉ có một đáp án đúng. Chỉ dùng nhiều đáp án khi câu hỏi nói rõ “Chọn tất cả đáp án đúng”.
7. Không dùng lựa chọn “Tất cả đáp án trên”, “Cả A và B” hoặc “Không có đáp án nào”.
8. Không dùng chữ cái A/B/C/D trong nội dung lựa chọn. Website tự đánh chữ cái.
9. Phân bố vị trí đáp án đúng tương đối đều, không luôn đặt ở chỉ số 0.
10. explanation phải giải thích ngắn gọn vì sao đáp án đúng dựa trên tài liệu; không chỉ lặp lại đáp án.
11. difficulty: 1 = nhận biết, 2 = hiểu/vận dụng trực tiếp, 3 = suy luận hoặc vận dụng nhiều bước.
12. kind chỉ nhận một trong: theory, calculation, code, application.
13. tags gồm 1–6 từ khóa ngắn, hữu ích cho tìm kiếm.

QUY TẮC ID VÀ THAM CHIẾU
- id của bộ luôn là "it1140".
- Mọi id dùng chữ thường không dấu, số và dấu gạch ngang; không có khoảng trắng.
- id câu hỏi có dạng "it1140-{topic-id}-{nnn}", ví dụ "it1140-he-dieu-hanh-001".
- topic của mỗi câu phải trùng đúng một id có trong topics.
- source của mọi câu phải bằng đúng {{SOURCE_ID_KEBAB_CASE}}.
- Không được trùng id câu hỏi trong cùng file.
- answer là CHỈ SỐ bắt đầu từ 0: lựa chọn đầu tiên là 0, lựa chọn thứ hai là 1. Với nhiều đáp án, dùng mảng tăng dần như [0, 2].

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
Hãy tự kiểm tra âm thầm từng câu: JSON hợp lệ; id duy nhất; topic/source tồn tại; số chỉ mục answer nằm trong choices; đáp án đúng thực sự được tài liệu hỗ trợ; không có câu trùng ý; không có nội dung tiếng Anh không cần thiết. Chỉ xuất JSON cuối cùng, không xuất checklist.
```
