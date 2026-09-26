# Ngân hàng ôn tập chương 2 — Hệ thống máy tính

Nguồn chính: PDF chương 2, 86 trang, trong `OneDrive_1_9-22-2026.zip` người dùng cung cấp. Đã đọc và đối chiếu toàn bộ phần nội dung; số trang trong lời giải là thứ tự trang PDF. Không đưa tài liệu gốc lên website. Nguồn và nhóm kiến thức chỉ là metadata biên tập, giao diện người học chọn theo chương.

## Phân bố 160 câu

| Nhóm kiến thức | Hậu tố ID | Trắc nghiệm | Điền số |
| --- | --- | ---: | ---: |
| Mô hình và tổ chức máy tính | 001–010 | 10 | 0 |
| CPU và hiệu năng | 011–024 | 8 | 6 |
| Bộ nhớ và lưu trữ | 025–040 | 13 | 3 |
| Vào–ra, bus và thành phần PC | 041–056 | 13 | 3 |
| Phần mềm và ngôn ngữ lập trình | 057–070 | 14 | 0 |
| Hệ điều hành | 071–080 | 10 | 0 |
| Tệp, wildcard, thư mục và đường dẫn | 081–104 | 20 | 4 |
| Giao diện và Windows | 105–118 | 14 | 0 |
| Thành phần và vai trò trong mạng | 119–126 | 8 | 0 |
| Thiết bị mạng | 127–138 | 12 | 0 |
| Đường truyền và giao thức | 139–148 | 10 | 0 |
| Phân loại mạng và kiến trúc dịch vụ | 149–160 | 12 | 0 |
| **Tổng** | | **144** | **16** |

## Ma trận đối chiếu nội dung

Số câu là hậu tố ID, không phải thứ tự sau khi trộn. Các trang 1–3, 32, 42, 65–66 là tiêu đề/dàn ý. Các hình cấu hình máy, giao diện và bảng lịch sử được dùng để kiểm tra khái niệm; không yêu cầu học thuộc từng số liệu sản phẩm hay mọi dòng mã assembly.

| Kiến thức trong tài liệu | Trang | Câu |
| --- | --- | --- |
| Định nghĩa máy tính; máy nhúng, smartphone, PC, server, siêu máy tính | 4–5 | 001–002, 010 |
| Nhập–xử lý–xuất, lưu trữ; tác nhân người, vật lý, máy khác | 6–7 | 001, 003–005 |
| CPU, bộ nhớ chính, vào–ra, liên kết hệ thống | 8–9 | 006–008 |
| Chu trình nhận/thực hiện; giải mã, toán hạng, ghi kết quả | 10–11 | 009, 014–015 |
| CU, ALU, tập thanh ghi | 12 | 011–013 |
| MIPS, tần số/chu kỳ xung nhịp, hiệu năng phụ thuộc hệ thống | 13–14 | 016–023 |
| Đọc bảng siêu máy tính: lõi, hiệu năng đo và công suất | 15 | 024 |
| Đọc/ghi, phân cấp trong/ngoài, tốc độ/dung lượng | 16–18 | 025–028, 037–040 |
| Nhớ chính chứa chương trình/dữ liệu; địa chỉ byte và nội dung | 19 | 026, 029–030, 040 |
| ROM/RAM, khả năng đọc/ghi, tính khả biến | 19 | 031–032 |
| Cache, chênh lệch CPU–RAM, nạp khối và tái sử dụng | 20 | 033–036 |
| Nhớ ngoài lưu phần mềm/dữ liệu, kết nối vào–ra | 21 | 032, 037 |
| Từ/quang/bán dẫn; HDD, đĩa mềm, CD/DVD, flash, thẻ nhớ, SSD | 22 | 028, 038–039 |
| Ngoại vi và mô-đun I/O; nhiều cổng được đánh địa chỉ | 23–26 | 041–046 |
| Thiết bị vào/ra, nhớ và truyền thông; vật lý ↔ số | 25 | 042–044 |
| Chipset, đường tín hiệu, liên kết tương thích dòng CPU | 27 | 047–048 |
| Bus địa chỉ/dữ liệu/điều khiển, độ rộng và truyền song song | 28 | 049–053 |
| Thành phần desktop, all-in-one, gaming PC, laptop | 29–31 | 010, 054–056 |
| Chương trình/phần mềm, tính linh hoạt, hệ thống/ứng dụng | 33–35 | 057–061 |
| BIOS, UEFI, bootloader; ổn định/an toàn phần mềm nền | 34–35 | 060–061 |
| Nghiệp vụ, khoa học/kỹ thuật, nhúng, web, di động | 36 | 062–063 |
| Giải thuật → chương trình → ngôn ngữ lập trình | 37 | 064 |
| Mã máy nhị phân, phụ thuộc kiến trúc, cách viết hệ 16 | 38–39 | 065–066 |
| Hợp ngữ, hợp dịch, ADD AX/BX; ví dụ xuất chuỗi | 39–40 | 067–069 |
| Ngôn ngữ bậc cao, ít phụ thuộc phần cứng, cơ chế dịch | 41 | 070 |
| Vai trò OS; nền tảng server/PC/mobile/TV/watch/nhúng | 43 | 071, 075–078 |
| Khởi động, giao diện, tài nguyên, thiết bị, tiến trình, tệp/lệnh | 44 | 072–074, 079–080, 105–107 |
| Tệp, tên và đuôi, ký tự hợp lệ, độ dài tên/đường dẫn | 45–46 | 081–086 |
| Phần mở rộng, loại nội dung, đổi tên không đổi định dạng | 47 | 087–089 |
| ? một ký tự, * chuỗi bất kỳ; so khớp và đếm kết quả | 48 | 090–096 |
| Phân vùng/ổ logic, tên trong thư mục, cấu trúc cây/gốc | 49–51 | 097–099, 102 |
| Đường dẫn đầy đủ/tương đối, thứ tự thư mục, thư mục chứa | 51–52 | 100–103 |
| Thao tác tệp, lệnh quản trị hệ thống và phần mềm | 53 | 074, 080, 104 |
| CLI, GUI, thiết bị trỏ/phím tắt, nhiều giao diện cùng OS | 54–55 | 105–107 |
| Mốc Xerox Star, Apple Lisa, Windows 1.01 | 56–58 | 108 |
| NUI: cử chỉ/lời nói/chuyển động, cảm biến/nhận dạng, tiếp cận | 59–60 | 109–111, 118 |
| Windows/Microsoft, mốc phát hành, tài khoản/dịch vụ | 61–63 | 112–115 |
| Desktop, ứng dụng đóng gói, website/Store; CLI/GUI/NUI | 63–64 | 116–118 |
| Mục đích mạng và bốn thành phần | 67 | 119–120 |
| Đầu cuối đa dạng, nguồn/đích thông tin, sử dụng từ xa | 68 | 121–123 |
| Server, dịch vụ tập trung, xác thực, sẵn sàng 24/7 | 69 | 124–125 |
| Thiết bị mạng chuyên dụng và tích hợp | 70 | 126, 137–138 |
| Hub, switch, router; phạm vi chuyển tiếp và nhược điểm hub | 71 | 127–132 |
| Router/switch mạng trục ISP | 72 | 133 |
| BTS, truy nhập di động và vùng phủ | 73 | 134, 143 |
| Firewall giữa LAN/Internet và các phân vùng nội bộ | 74 | 135–136 |
| Modem tích hợp, router, switch, WiFi Access Point | 75 | 137–138 |
| Đồng trục, xoắn đôi, quang, vô tuyến; LAN/Internet | 76–77 | 139–144 |
| Giao thức: liên thông, cú pháp, ý nghĩa, thứ tự, xử lý | 78 | 145–146, 148 |
| Trình tự trao đổi minh họa khi truy cập web | 79 | 147–148 |
| Phạm vi địa lý khác tiêu chí kiến trúc dịch vụ | 80 | 149 |
| PAN/Bluetooth, LAN/Ethernet/WiFi, MAN, WAN, GAN/Internet | 81–84 | 150–155 |
| Client/Server, yêu cầu–phục vụ, tập trung, dự phòng | 85 | 156–158 |
| P2P, vai trò ngang hàng, trực tiếp, không thường trực | 86 | 159–160 |

## Chất lượng đáp án

- Bốn phương án/câu, một đáp án đúng; A/B/C/D mỗi vị trí 36 lần, không dùng thứ tự tuần hoàn.
- Ưu tiên nhầm lẫn gần nhau: CU/ALU/thanh ghi, ROM/RAM/cache, địa chỉ/nội dung, bit/byte, GHz/MIPS, bus, mã máy/hợp ngữ, CLI/GUI/NUI, wildcard, router/switch/hub và mô hình mạng.
- Phương án ghép cặp dùng cùng cấu trúc, bài tính dùng lỗi đổi đơn vị/off-by-one. Đã rà và thay các nhiễu khác loại quá rõ; kiểm thử còn cảnh báo đáp án đúng dài vượt trội. Đây không phải chứng minh rằng mọi câu đều có độ khó như nhau.
- Mỗi câu có giải thích. Bài tính nêu rõ giả thiết (byte-addressed, không chờ thêm, quy tắc wildcard, có tính gốc hay không). Bài đường dẫn dùng một dấu phân cách thực, không hiển thị dấu escape JSON.
- Giữ nguyên 124 câu và ID chương 1 để không mất tiến độ. Khi thêm chương, trạng thái nộp bài thi tách theo chương; câu trả lời/ghim vẫn gắn với ID câu.

## Đính chính và giới hạn của tài liệu

1. **Tên tệp Windows:** không dùng khoảng 32767 ký tự làm giới hạn chung của một tên tệp. Tên thành phần và đường dẫn có quy tắc khác nhau. Đối chiếu [quy tắc đặt tên của Microsoft](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file).
2. **Windows 11:** mốc phát hành là 05/10/2021, không phải tháng 11; đối chiếu [thông báo Microsoft](https://blogs.windows.com/windowsexperience/2021/08/31/windows-11-available-on-october-5/). Không biến thị phần/số người dùng trên slide thành số liệu hiện tại.
3. **Phân phối ứng dụng:** ứng dụng đóng gói không mặc nhiên chỉ cài qua Store. Có những phương thức triển khai ngoài Store, tùy điều kiện; xem [Microsoft: chọn kênh phân phối](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/choose-distribution-path).
4. **Cáp đồng trục:** không khẳng định đã biến mất khỏi mạng; [CableLabs mô tả mạng HFC/DOCSIS](https://www.cablelabs.com/technologies/hfc-networks). Không suy ra băng thông cụ thể chỉ từ vật liệu cáp.
5. **Switch:** câu chuyển tiếp đến riêng cổng đích đã giới hạn vào unicast biết cổng đích; không khẳng định switch không bao giờ phát ra nhiều cổng.
6. **Firewall:** kiểm soát theo chính sách, không bảo đảm tuyệt đối không có mã độc; không giới hạn khái niệm vào hộp phần cứng.
7. **Phân loại mạng:** phạm vi địa lý là tiêu chí; số người dùng nêu trong ví dụ không phải ngưỡng cứng. Peer ngang hàng không có nghĩa phần cứng như nhau.
8. **Wildcard:** câu hỏi dùng quy tắc hình thức được nêu rõ, không ngầm lấy mọi ngoại lệ của DOS/Win32 làm quy tắc chung.

Ma trận bao phủ các mục kiến thức của chương, không phải cam kết bao gồm mọi biến thể bài tập có thể sinh ra. Các tên hãng, model, ảnh minh họa và thống kê lịch sử không được biến thành hàng loạt câu học thuộc vụn vặt.

## Kiểm thử

Chạy `node scripts/validate-data.mjs` và `node scripts/test-quiz.mjs`. Kiểm tra cấu trúc 284 câu/70 bài Python, phân bố chương 2, tính độc lập 16 đáp án số, wildcard, đường dẫn, chấm đúng/sai, lưu tiến độ, chuyển bộ lọc cũ, chọn chương và tách trạng thái nộp bài. Chất lượng ngữ nghĩa và mức bao phủ vẫn cần biên tập; test tự động không thay thế đối chiếu tài liệu.
