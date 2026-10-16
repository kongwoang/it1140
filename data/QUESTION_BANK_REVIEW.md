# Rà soát và mở rộng ngân hàng IT1140

Ngày biên tập: 16/10/2026. Đây là phân loại chuyên môn để ôn tập, **chưa phải độ khó được đo trên sinh viên thật**. Không suy ra tỷ lệ làm đúng từ đánh giá của LLM.

## Kết quả

- 2.096 câu, thêm 956 câu so với mốc 1.140; giữ nguyên toàn bộ ID cũ.
- 1.242 câu một đáp án, 758 câu điền số, 96 câu chọn nhiều đáp án.
- 604 câu Dễ, 1.223 câu Vừa, 269 câu Khó.
- Phân lại nhãn của 699 câu cũ; sửa phương án nhiễu của 87 câu; xử lý các câu thiếu tiền đề hoặc diễn đạt lệch kiểu hỏi. Số đếm sửa phương án nhiễu không gồm các câu sửa riêng cả đề và lựa chọn.
- Mỗi chương có 8 câu nhiều đáp án: 2–3 lựa chọn đúng trong 4 lựa chọn. Câu hỏi không tiết lộ số đáp án đúng. Chọn đủ, không chọn thừa mới được chấm đúng.
- Giữ 70 bài thực hành và ca kiểm thử đã có; mở rộng ở đây là ngân hàng ôn tập, không tự bổ sung 956 bài lập trình phải nộp.

## Ma trận nội dung và số lượng hiện tại

Các chủ đề nhỏ vẫn được giữ trong JSON phục vụ biên tập, không đưa nguồn hoặc nhóm chủ đề nhỏ trở lại UI. Số trang dưới đây là phạm vi tài liệu nền, không phải khẳng định câu mới chép nguyên văn một trang.

| Chương | Số câu | Hướng bổ sung và kiểm tra | Tài liệu nền |
| --- | ---: | --- | --- |
| 1 | 208 | Ngữ cảnh dữ liệu, mã định danh, bit/byte, dung lượng ảnh/tín hiệu với thông số cho sẵn, hệ đếm, bù hai, tràn, mặt nạ, IEEE, encoding | Bài giảng chương 1; ma trận chi tiết trong CHUONG_1_REVIEW.md |
| 2 | 208 | Khoanh vùng chức năng, CPI/MIPS, cache, địa chỉ theo ô/byte, bus chưa đầy, đường dẫn/wildcard, vai trò thiết bị và kiến trúc dịch vụ | Bài giảng chương 2; CHUONG_2_REVIEW.md |
| 3 | 248 | Chẩn đoán DNS/Web, giới hạn băng thông, mô hình cloud, CIA, miền giả, MFA, ký/mã hóa, quyền trình duyệt và sao lưu phiên bản | Bài giảng chương 3; CHUONG_3_REVIEW.md |
| 4 | 218 | Mã giả có cận rõ, đếm thao tác, trạng thái trước/sau gán, phản ví dụ, ca biên, bất biến, kết thúc đệ quy, bảo toàn dữ liệu khi chèn/xóa | Tài liệu Thuật toán; CHUONG_4_REVIEW.md |
| 5 | 118 | Biến/gán, kiểu, chuỗi và số, dấu/độ ưu tiên, chia nguyên, đổi đơn vị, cách thiết kế kiểm tra cơ bản | Bài giảng chương 5; Python Language Reference |
| 6 | 158 | Nhánh chồng lấn, cận ngưỡng, dừng sớm, truthiness, range, break/continue, vòng lồng, bộ tích lũy và thống kê | Bài giảng chương 6; Python Tutorial |
| 7 | 158 | Trả/in, lời gọi lồng, tham số, mặc định/từ khóa, mutation/rebinding, hàm bậc cao, closure và đệ quy | Bài giảng chương 7; Python Tutorial phần Control Flow |
| 8 | 158 | Lát cắt, khoảng trắng/rỗng, find, count không chồng, strip tập ký tự, split/join, định dạng, Unicode/byte và chuẩn hóa | Bài giảng chương 8; Python Built-in Types |
| 9 | 158 | List/tuple, append/extend, gán lát cắt, alias/sao chép nông, list lồng, comprehension, zip iterator, khóa sắp xếp và thống kê dict | Bài giảng chương 9; Python Built-in Types |
| 10 | 208 | Import, math/random, NumPy view/copy, broadcasting/axis/overflow, I/O trong bộ nhớ, CSV có nháy, đường dẫn, JSON/pickle | Bài giảng chương 10; tài liệu Python/NumPy |
| 11 | 128 | Trạng thái Turtle, callback, hướng/góc, chọn biểu đồ, thang trục, ghép cặp dữ liệu, Axes/Figure, bin và trình bày | Bài giảng chương 11; tài liệu Turtle/Matplotlib |
| 12 | 128 | Chọn phần cứng theo tải, phân loại/hồi quy/phân cụm, chất lượng dữ liệu và đánh giá, kiểm chứng AI, edge/cloud, nhóm khóa và giới hạn blockchain | Bài giảng chương 12; phạm vi nhận biết/hiểu ứng dụng |

## Quy tắc độ khó

- **Dễ (1):** nhớ/nhận biết hoặc áp dụng một quy tắc quen thuộc, không có chuỗi suy luận đáng kể.
- **Vừa (2):** áp dụng kiến thức vào dữ kiện mới, chọn nhánh, xử lý một quy tắc biên, phân biệt hai khái niệm hay nhầm.
- **Khó (3):** phối hợp các quy tắc, theo dõi nhiều thay đổi trạng thái, vòng lồng/đệ quy, tìm phản ví dụ hoặc tổng hợp nhiều điều kiện.

Độ dài đề, từ lạ, việc chọn nhiều đáp án và việc học thuộc một con số không tự tạo mức Khó. Một câu chỉ có một phép tra/đếm vẫn được gắn Dễ dù thuộc chương cuối. Không ép ba mức phải có cùng số câu hoặc biến mọi câu thành câu khó.

## Các vấn đề cụ thể đã xử lý

- C1–007, C1–017, C1–034 và các câu tương tự không còn mặc định ở Khó chỉ vì có ngữ cảnh hoặc phép đổi đơn vị.
- C2–066: bỏ các câu trả lời Có/Không không khớp với câu hỏi Vì sao.
- C3–032: thay ba lựa chọn không liên quan bằng nhầm lẫn giữa cổng TCP, MAC, IP router và tên miền. Nhiều câu khác cũng thay nhiễu bằng nhầm lẫn trong cùng lĩnh vực.
- C7–026: đưa quy tắc đối số mặc định được tạo khi định nghĩa vào đề trước khi hỏi vận dụng.
- C8–023: đổi 2.25 thành 2.26; mục tiêu là định dạng một chữ số thập phân, không đánh đố bằng quy tắc làm tròn số ở đúng trung điểm.
- C8–036: nói rõ isidentifier kiểm tra hình thức, không loại trừ từ khóa.
- C10–072: thay thuật ngữ “cookie vị trí” bằng bài toán lưu vị trí tell rồi quay lại bằng seek.
- C10–090: không nêu sẵn n=0 trong chính yêu cầu tìm trường hợp cần xử lý.
- C11–003: dùng cấu hình pensize tường minh để không phạt sinh viên nhớ con số mặc định ghi khác trong slide.

Một số câu dễ được giữ có chủ đích cho việc học nền tảng. Để tránh rèn mẹo từ câu liền trước, các câu mới được xen thứ tự trong từng chương; giao diện vẫn có chức năng trộn. Không thay ID cũ hoặc phá liên kết ghim/tiến độ của người dùng.

## Tham khảo đề và câu hỏi công khai trên Internet

Chỉ tham khảo **dạng nhiệm vụ**, tự soạn lời văn, dữ kiện và lời giải; không sao chép nguyên đề, không nhập dữ liệu/đáp án từ Internet bằng chương trình.

1. [HUST — trang IT1140 của giảng viên Bùi Trọng Tùng](https://users.soict.hust.edu.vn/tungbt/it1140/): đối chiếu phạm vi thông tin, hệ thống máy tính và thuật toán. Đây là chương trình cũ dùng C; không nhập phần C hoặc tin học văn phòng vào bộ Python hiện tại.
2. [MIT OCW 6.0001 — Lecture 5, in-class questions](https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/pages/in-class-questions-and-video-solutions/lecture-5/): tham khảo cách theo dõi thứ tự thao tác list, tuple và alias. Ví dụ và phương án trong ngân hàng được biên soạn độc lập.
3. [Cornell CS1110 — đề cuối kỳ mẫu có lời giải](https://courses.cs.cornell.edu/cs1110/2021sp/exams/final/2013-fall-final-answers.pdf): tham khảo nhiệm vụ chọn ca kiểm thử khác biệt, theo dõi trạng thái và suy luận vòng lặp. Tài liệu cũ có cú pháp Python 2 và cả lỗi trình bày; không dùng làm chuẩn đáp án Python 3, không mang phần lớp/OOP nâng cao hay biến đổi Haar vào chương trình này.
4. [Cornell — hướng dẫn ôn Prelim 1](https://www.cs.cornell.edu/courses/cs1110/2024fa/exams/prelim1/prelim1-study-guide.pdf): tham khảo nguyên tắc kiểm tra trong phạm vi người mới đã được luyện. Không suy ra lịch thi hoặc đề cương IT1140 từ tài liệu này.

Chuẩn hành vi được đối chiếu với [Python Built-in Types](https://docs.python.org/3/library/stdtypes.html), [Python Control Flow](https://docs.python.org/3/tutorial/controlflow.html), [Python I/O](https://docs.python.org/3/tutorial/inputoutput.html), [NumPy broadcasting](https://numpy.org/doc/stable/user/basics.broadcasting.html) và [Matplotlib API](https://matplotlib.org/stable/api/index.html). Mã kiểm chứng dùng Python 3.12, NumPy 2.2.6 trong CI.

## Kiểm chứng và giới hạn

```sh
node scripts/validate-data.mjs
node scripts/test-quiz.mjs
python scripts/test-python-quiz.py
python scripts/test-question-calculations.py
```

- Giữ các phép kiểm chứng độc lập của mốc 1.140, thêm kiểm tra toàn bộ 2.096 câu về cấu trúc, số lượng, ID/đề duy nhất, phân bố đáp án đơn, ba mức độ khó và 96 câu nhiều đáp án.
- Chạy 776 fixture Python/NumPy đúng mã đang hiển thị; đối chiếu 171 bài số học/thuật toán bằng chương trình riêng. Không tự chạy mã tải từ đề Internet.
- Kiểm tra chấm đủ/thiếu/thừa và không phụ thuộc thứ tự chọn trên **mọi câu nhiều đáp án thực tế**, không chỉ ví dụ giả lập. Kiểm tra lưu/đọc lại và lọc chương.
- Thử mẹo chọn lựa chọn dài nhất trên câu một đáp án: chương 3 từ 69/182 xuống 64/195; chương 12 từ 32/64 xuống 32/95 (chỉ tính câu có một lựa chọn dài nhất duy nhất). Đây là tín hiệu biên tập, không phải điểm sinh viên hay chứng minh phương án nhiễu đã hoàn hảo.
- Vẫn cần dữ liệu sinh viên thật để hiệu chỉnh tỷ lệ đúng và mức phân biệt. Các biến thể của cùng mẫu được giới hạn tối đa ba bộ dữ liệu để luyện điều kiện biên/nhánh; không coi chúng là ba kiến thức mới.

Nguồn, nhóm kiến thức và ghi chú này chỉ phục vụ biên tập; UI chính vẫn chỉ phân loại theo chương. Website hoàn toàn tĩnh và lưu tiến độ trên trình duyệt.
