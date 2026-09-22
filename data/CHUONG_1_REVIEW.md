# Ngân hàng ôn tập chương 1

Nguồn chính: PDF chương 1 “Thông tin và dữ liệu” (85 trang) trong `OneDrive_1_9-22-2026.zip` do người dùng cung cấp. Số trang trong lời giải là thứ tự trang PDF, trùng số trang nội dung trên slide. Không đưa PDF gốc lên website.

## Ma trận nội dung

| Chủ đề | Số thứ tự ID | Trang nguồn | Trắc nghiệm | Điền số |
| --- | --- | --- | ---: | ---: |
| WKID, dữ liệu tự nhiên/nhân tạo, số hóa, kiểu dữ liệu | 001–012, 101 | 9–17 | 13 | 0 |
| Bit/byte, đơn vị, độ dài từ, cơ số và số trạng thái | 013–022, 102 | 16–28 | 7 | 4 |
| Chuyển đổi nguyên/lẻ giữa hệ 2/8/10/16, tìm cơ số | 023–036, 103–107 | 23–44, 79 | 15 | 4 |
| Không dấu, bù một/bù hai, giới hạn, mở rộng dấu | 037–050, 108–109 | 45–56 | 11 | 5 |
| Cộng, trừ, nhân, chia, carry và overflow | 051–062, 110–113 | 57–67 | 11 | 5 |
| AND, OR, XOR, NOT, mặt nạ bit | 063–070 | 68–69 | 7 | 1 |
| Chuẩn hóa, IEEE 754, bias, mã đặc biệt, sai số | 071–088, 114–120 | 70–79 | 19 | 6 |
| ASCII, Unicode, mã điều khiển, lưu trữ ký tự | 089–100, 121–124 | 80–85 | 13 | 3 |
| **Tổng** | **124 câu** | | **96** | **28** |

Các trang 1–6 là giới thiệu học phần, 7–8 là tiêu đề/dàn ý; không biến thông tin tổ chức học phần thành câu hỏi thuộc kiến thức chương. Các ví dụ biến đổi số và mặt nạ có câu vận dụng, không chỉ hỏi thuộc định nghĩa. Độ khó là phân loại biên soạn, chưa phải kết quả đo trên người học.

## Nguyên tắc biên soạn

- Mỗi câu trắc nghiệm có bốn lựa chọn, một đáp án đúng. Phân bố đáp án đúng: A/B/C/D mỗi vị trí 24 lần, thứ tự không tuần hoàn.
- Phương án nhiễu dựa trên lỗi đọc hệ đếm, sai trọng số, đảo thứ tự bit, nhầm bù một/bù hai, carry/overflow, off-by-one và nhầm giá trị số với mã ký tự.
- Hai câu tính toán có thể dùng cùng dữ liệu để kiểm tra các phép khác nhau; tránh chỉ thay vài từ để lặp lại một định nghĩa.
- Câu điền số có kết quả chính xác hữu hạn, bao gồm 0, số âm và số thập phân. Đáp án JSON dùng dấu chấm; UI nhận cả dấu chấm và dấu phẩy.
- Mọi câu có lời giải và trang tham khảo. Câu suy luận được xây dựng từ kiến thức ở các trang dẫn, không khẳng định là câu nguyên văn của giảng viên.

## Những điểm đã đối chiếu

- Đơn vị KB/MB/… dùng bội số 1024 theo quy ước được nêu rõ trong đề. Sửa lỗi ký hiệu PB trên trang 18 thành `1 PB = 1024 TB = 2^50 B`; không đồng nhất quy ước của bài giảng với tiền tố SI trong mọi ngữ cảnh.
- Bit dấu bằng 0 trong bù hai nghĩa là **không âm**, gồm cả 0. Dải n bit là `−2^(n−1)…2^(n−1)−1`; đổi dấu giá trị nhỏ nhất không thể giữ nguyên độ rộng.
- Carry-out không đồng nghĩa overflow có dấu. Các câu giữ bit thấp nêu rõ độ rộng và cách giải mã.
- Công thức có bit 1 đầu ngầm định chỉ dùng cho số **chuẩn hóa** binary32/binary64. Không áp dụng máy móc cho zero, NaN, vô cực hoặc dạng mở rộng 80 bit. Câu 80 bit kiểm tra bias, khuôn dạng và bậc độ lớn; phân biệt 64 bit định trị lưu trữ với 63 bit phần lẻ và một bit đầu tường minh theo [Oracle Double-Extended Format](https://docs.oracle.com/cd/E37069_01/html/E39019/z4000ac019433.html).
- Không dùng các khoảng giá trị xấp xỉ trên slide làm biên chính xác của IEEE 754. Binary32 có 23 bit phần lẻ lưu trữ; binary64 có 52 bit phần lẻ (53 bit chính xác với số chuẩn hóa). Đối chiếu [Oracle Numerical Computation Guide](https://docs.oracle.com/cd/E37069_01/html/E39019/z4000ac019269.html).
- Không lặp lại mô tả Unicode như một bảng mã cố định 8 bit hoặc một số lượng ký tự bất biến. Phân biệt mã ký tự với cách mã hóa UTF theo [Unicode FAQ](https://www.unicode.org/faq/utf_bom.html) và [Unicode Principles](https://unicode.org/standard/principles.html).

## Rà soát mức bao phủ ngày 22/09/2026

Bản 100 câu đã chạm đủ các nhóm lớn nhưng chưa kiểm tra trực tiếp mọi kỹ năng con. Đã thêm 24 câu (101–124), không sửa câu hay ID cũ. Trong bảng dưới, số là hậu tố ID câu hỏi, không phải số thứ tự sau khi người học trộn câu. Đây là đối chiếu nội dung, không phải cam kết bộ câu hỏi chứa mọi bài tập có thể phát sinh từ chương.

| Nội dung trên slide | Trang | Câu kiểm tra trực tiếp hoặc vận dụng |
| --- | --- | --- |
| Bốn tầng WKID, thứ tự và các nhóm câu hỏi gắn với tầng | 9–12 | 001–006, 101 |
| Vai trò dữ liệu đầu vào, nhiều nguồn dữ liệu, lưu trữ nhị phân | 13 | 007–009, 012 |
| Nhân tạo/tự nhiên; mã hóa số, ký tự; số hóa tín hiệu | 14 | 008–009, 011–012 |
| Kiểu cơ bản/có cấu trúc; độ dài từ dữ liệu | 15–17 | 010–011, 016–017 |
| Bit/byte, hai trạng thái, KB đến PB theo quy ước bài giảng | 18 | 013–017, 102 |
| Cơ số, chữ số hợp lệ, số trạng thái, mã hóa 1000 đối tượng | 20–22, 25–26, 28, 30 | 018–022, 027, 102 |
| Giá trị vị trí: cả phần nguyên và phần lẻ, công thức tổng quát | 23–25, 27, 29, 31, 33 | 023, 026–027, 034–035, 103, 107 |
| Chia liên tiếp, nhân liên tiếp, thứ tự đọc, tách nguyên/lẻ | 34–39 | 024–025, 032–033, 104–105 |
| Phân tích thành lũy thừa hai để đổi nhanh | 40 | 024–025 (kèm lời giải phân tích trọng số) |
| Nhóm 3/4 bit, đệm đúng phía, đổi qua hệ 2 trung gian | 41–42 | 022, 028–031, 106 |
| Đổi thập phân sang hệ 16, vận dụng sang hệ 8 | 43–44 | 104–105 |
| Số nguyên không dấu, giá trị và dải n bit | 45–49 | 037–040, 051–053 |
| Bù một, bù hai: thao tác bit, công thức, tổng với số đối | 50–53 | 041–043, 050, 108–109 |
| Bù hai: trọng số âm, dải giá trị, biên, bit dấu | 54–56 | 039, 044–050 |
| Cộng có nhớ, trừ có vay, giữ n bit thấp | 58–60 | 051–053, 110–111 |
| Cộng có dấu, phân biệt carry/overflow, dấu của tổng | 61–63 | 054–057 |
| Trừ bằng cộng bù hai và tràn phép trừ | 64 | 058–059 |
| Nhân/chia không dấu, thương và dư | 65–66 | 060–061 |
| Nhân/chia có dấu, chuyển độ lớn và hiệu chỉnh dấu | 67 | 062, 112–113 |
| Bảng chân trị và tác động từng bit, không truyền nhớ | 68 | 063–066, 069–070 |
| AND xóa bit, OR đặt bit và giữ phần còn lại | 69 | 067–068 |
| Ký pháp M×R^E và ý nghĩa các thành phần | 70 | 072, 114 |
| Khuôn dạng 32/64/80 bit, bias, bit ngầm định | 71–73 | 071, 073–076, 085, 116–117 |
| Mã hóa/giải mã số thực, chuẩn hóa số có mũ âm | 74–76 | 077–079, 115, 117 |
| ±0, ±∞, NaN; phân biệt với số chuẩn hóa | 77 | 080–083 |
| Miền biểu diễn 32/64/80 bit, overflow/underflow | 78 | 084, 088, 120 |
| Sai số máy, khoảng cách không đều, cắt bỏ/làm tròn | 79 | 036, 086–087, 118–119 |
| Mã ký tự khác giá trị số; số bit phụ thuộc bộ mã | 80–81 | 089, 092, 098–100 |
| ASCII: dải chuẩn/mở rộng, hiển thị/điều khiển, các nhóm ký tự | 81–83 | 089–095, 121–123 |
| Mã mở rộng do nhà sản xuất/phần mềm quy định | 84 | 096, 123 |
| Unicode: thống nhất, đa ngôn ngữ, nhiều UTF, tổ chức quản lý | 85 | 097–098, 124 |

Không học thuộc các lỗi in hoặc số liệu phụ thuộc phiên bản: dòng PB, cách gọi mọi bit dấu 0 là số dương, mô tả Unicode bằng độ rộng cố định, số lượng ký tự Unicode “hiện có”. Các trang 1–8 là giới thiệu/dàn ý, không phải phần kiến thức cần bổ sung câu.

## Kiểm thử

Chạy `node scripts/validate-data.mjs` và `node scripts/test-quiz.mjs`. Bộ kiểm thử kiểm tra cấu trúc, phân bố câu/đáp án, các phép tính có thể tái lập, nhập số và chấm đúng/sai. Sau khi đổi nội dung cần rà lại bằng người biên soạn; kiểm thử tự động không chứng minh chất lượng sư phạm của phương án nhiễu.
