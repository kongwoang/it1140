# Ngân hàng ôn tập chương 1

Nguồn chính: PDF chương 1 “Thông tin và dữ liệu” (85 trang) trong `OneDrive_1_9-22-2026.zip` do người dùng cung cấp. Số trang trong lời giải là thứ tự trang PDF, trùng số trang nội dung trên slide. Không đưa PDF gốc lên website.

## Ma trận nội dung

| Chủ đề | Số thứ tự ID | Trang nguồn | Trắc nghiệm | Điền số |
| --- | --- | --- | ---: | ---: |
| WKID, dữ liệu tự nhiên/nhân tạo, số hóa, kiểu dữ liệu | 001–012 | 9–17 | 12 | 0 |
| Bit/byte, đơn vị, độ dài từ, cơ số và số trạng thái | 013–022 | 16–28 | 6 | 4 |
| Chuyển đổi nguyên/lẻ giữa hệ 2/8/10/16, tìm cơ số | 023–036 | 25–44, 79 | 11 | 3 |
| Không dấu, bù một/bù hai, giới hạn, mở rộng dấu | 037–050 | 45–56 | 10 | 4 |
| Cộng, trừ, nhân, chia, carry và overflow | 051–062 | 57–67 | 9 | 3 |
| AND, OR, XOR, NOT, mặt nạ bit | 063–070 | 68–69 | 7 | 1 |
| Chuẩn hóa, IEEE 754, bias, mã đặc biệt, sai số | 071–088 | 70–79 | 15 | 3 |
| ASCII, Unicode, mã điều khiển, lưu trữ ký tự | 089–100 | 80–85 | 10 | 2 |
| **Tổng** | **100 câu** | | **80** | **20** |

Các trang 1–6 là giới thiệu học phần, 7–8 là tiêu đề/dàn ý; không biến thông tin tổ chức học phần thành câu hỏi thuộc kiến thức chương. Các ví dụ biến đổi số và mặt nạ có câu vận dụng, không chỉ hỏi thuộc định nghĩa. Độ khó là phân loại biên soạn, chưa phải kết quả đo trên người học.

## Nguyên tắc biên soạn

- Mỗi câu trắc nghiệm có bốn lựa chọn, một đáp án đúng. Phân bố đáp án đúng: A/B/C/D mỗi vị trí 20 lần, thứ tự không tuần hoàn.
- Phương án nhiễu dựa trên lỗi đọc hệ đếm, sai trọng số, đảo thứ tự bit, nhầm bù một/bù hai, carry/overflow, off-by-one và nhầm giá trị số với mã ký tự.
- Hai câu tính toán có thể dùng cùng dữ liệu để kiểm tra các phép khác nhau; tránh chỉ thay vài từ để lặp lại một định nghĩa.
- Câu điền số có kết quả chính xác hữu hạn, bao gồm 0, số âm và số thập phân. Đáp án JSON dùng dấu chấm; UI nhận cả dấu chấm và dấu phẩy.
- Mọi câu có lời giải và trang tham khảo. Câu suy luận được xây dựng từ kiến thức ở các trang dẫn, không khẳng định là câu nguyên văn của giảng viên.

## Những điểm đã đối chiếu

- Đơn vị KB/MB/… dùng bội số 1024 theo quy ước được nêu rõ trong đề. Sửa lỗi ký hiệu PB trên trang 18 thành `1 PB = 1024 TB = 2^50 B`; không đồng nhất quy ước của bài giảng với tiền tố SI trong mọi ngữ cảnh.
- Bit dấu bằng 0 trong bù hai nghĩa là **không âm**, gồm cả 0. Dải n bit là `−2^(n−1)…2^(n−1)−1`; đổi dấu giá trị nhỏ nhất không thể giữ nguyên độ rộng.
- Carry-out không đồng nghĩa overflow có dấu. Các câu giữ bit thấp nêu rõ độ rộng và cách giải mã.
- Công thức có bit 1 đầu ngầm định chỉ dùng cho số **chuẩn hóa** binary32/binary64. Không áp dụng máy móc cho zero, NaN, vô cực hoặc dạng mở rộng 80 bit. Câu 80 bit chỉ kiểm tra bias.
- Không dùng các khoảng giá trị xấp xỉ trên slide làm biên chính xác của IEEE 754. Binary32 có 23 bit phần lẻ lưu trữ; binary64 có 52 bit phần lẻ (53 bit chính xác với số chuẩn hóa). Đối chiếu [Oracle Numerical Computation Guide](https://docs.oracle.com/cd/E37069_01/html/E39019/z4000ac019269.html).
- Không lặp lại mô tả Unicode như một bảng mã cố định 8 bit hoặc một số lượng ký tự bất biến. Phân biệt mã ký tự với cách mã hóa UTF theo [Unicode FAQ](https://www.unicode.org/faq/utf_bom.html) và [Unicode Principles](https://unicode.org/standard/principles.html).

## Kiểm tra khi sửa

Chạy `node scripts/validate-data.mjs` và `node scripts/test-quiz.mjs`. Bộ kiểm thử kiểm tra cấu trúc, phân bố câu/đáp án, các phép tính có thể tái lập, nhập số và chấm đúng/sai. Sau khi đổi nội dung cần rà lại bằng người biên soạn; kiểm thử tự động không chứng minh chất lượng sư phạm của phương án nhiễu.
