# Đối chiếu ngân hàng câu hỏi chương 5–12

Tài liệu đầu vào: các PDF chương 5–12 trong `OneDrive_1_9-27-2026.zip`, đối chiếu ngày 27/09/2026. Số chương theo **tên tệp**, không theo tiêu đề bị sao chép nhầm bên trong một số slide. Số trang dưới đây là thứ tự trang PDF, tính từ 1. Không đưa PDF gốc vào website.

## Quy mô và phạm vi

| Chương | Nội dung | Trắc nghiệm | Điền số | Tổng |
|---|---|---:|---:|---:|
| 5 | Giới thiệu Python | 37 | 15 | 52 |
| 6 | Luồng điều khiển | 40 | 12 | 52 |
| 7 | Hàm | 47 | 8 | 55 |
| 8 | Xử lý chuỗi | 58 | 2 | 60 |
| 9 | List và tuple | 53 | 5 | 58 |
| 10 | Mô-đun, thư viện và tệp | 88 | 4 | 92 |
| 11 | Lập trình đồ họa | 55 | 10 | 65 |
| 12 | Các công nghệ số hiện đại | 72 | 2 | 74 |
| **Thêm mới** | | **450** | **58** | **508** |

Giữ nguyên 632 câu chương 1–4 và 70 bài thực hành Python. Toàn ngân hàng có **1.140 câu**. Câu hỏi không giới hạn theo số trang: gộp phần lặp lại và tách các khái niệm khác nhau. Không biến trang bìa, mục lục, trang trắng, số liệu quảng cáo/phần cứng theo thời điểm hoặc hình minh họa lặp lại thành câu học thuộc máy móc.

## Ma trận nội dung

Mã nhóm trong bảng là `topics[].id`; mỗi câu còn có trang đối chiếu trong giải thích. Số cuối ID câu tăng trong từng chương, không phải số trang. Có thể tìm theo `source=chuong-N-bai-giang` và `topic` để biên tập trong `subjects/it1140.json`.

| Chương / trang PDF | Kiến thức và tình huống đã đưa vào câu hỏi | Nhóm câu |
|---|---|---|
| 5 / 7–15 | Mã máy, hợp ngữ, ngôn ngữ bậc cao, assembler, biên dịch/thông dịch, liên kết, khả chuyển, bytecode | c5-ngon-ngu |
| 5 / 16–24 | Cú pháp, lỗi lúc chạy, logic; class/object; ưu nhược điểm Python, GIL có điều kiện; tác giả, chuyển Python 2→3 | c5-ngon-ngu, c5-so-hoc |
| 5 / 25–30 | Interpreter/editor/extension, PATH, terminal, REPL/script, môi trường notebook | c5-ngon-ngu |
| 5 / 32–44, 58–70 | Literal, biến, định danh, từ khóa, phân biệt hoa/thường, gán, hằng theo quy ước, kiểu động; int/float/complex/str; input, print, sep, chú thích, nối/lặp chuỗi | c5-bien-kieu, c5-so-hoc |
| 5 / 45–57 | Chia thực/lấy sàn, modulo âm, lũy thừa, thứ tự ưu tiên/kết hợp, gán kết hợp, ký hiệu khoa học, overflow/underflow, ngoặc công thức | c5-so-hoc |
| 5 / 71–74 | Lỗi thiếu nháy, số 09, toán tử một ngôi, thiếu toán tử, đổi thời gian/quãng đường, pace/tốc độ, tiền lương, escape | c5-bien-kieu, c5-so-hoc |
| 6 / 4–20 | So sánh/logic/đoản mạch/chân trị, thụt lề, if độc lập, if/elif, lồng nhau, nhánh không thể tới | c6-dieu-kien, c6-vong-lap |
| 6 / 21–29 | Phương trình bậc hai/suy biến, match/case/OR/wildcard, lỗi =/==/is, lương làm thêm, tam giác, số ngày/năm nhuận | c6-dieu-kien |
| 6 / 31–50 | while kiểm tra trước, tiến triển/dừng, for/iterable, range cận và bước, vòng lồng, break/continue, chuỗi rỗng | c6-vong-lap |
| 6 / 51–59 | Đếm, tích lũy, trung bình, lọc, cờ tìm kiếm, cực trị/None, is và ==, xử lý tập rỗng | c6-mau-bai-tap, c6-dieu-kien |
| 6 / 60–62 | Số lẻ giảm dần, giai thừa, tổng điều hòa, Armstrong, Ramanujan/điều kiện sai số/nghịch đảo, bảng phí và lặp nhập Y/y | c6-mau-bai-tap |
| 7 / 3–24 | Tái sử dụng/phân rã, def/lời gọi, tham số/đối số, docstring, return sớm/None, print khác return, built-in và che tên | c7-ham |
| 7 / 25–41 | Chia sẻ đối tượng, sửa mutable so với gán lại tham số, cục bộ/toàn cục, frame, truyền hàm thay kết quả, global, UnboundLocalError, import/sys.exit | c7-pham-vi, c7-de-quy |
| 7 / 42–50 | Hàm lồng, phạm vi, mặc định, keyword arguments, mặc định mutable và dùng None | c7-pham-vi |
| 7 / 51–59 | Nguyên tố/miền n<2, trung bình tập rỗng, hàm từng khoảng, hình thang xấp xỉ, binary, lambda/closure, map/filter/reduce, phân loại điểm | c7-ung-dung, c7-de-quy |
| 7 / 60–78 | Cơ sở/tiến triển/miền đệ quy, nhân/giai thừa, số lời gọi, quy nạp, Fibonacci/thỏ theo quy ước slide, Pascal, Hà Nội, đổi nhị phân, tổ hợp | c7-de-quy |
| 8 / 4–7 | Unicode/bytes, bất biến, dấu nháy/ba nháy/raw/escape, không có char riêng, chỉ số âm, lỗi chỉ số, slice cắt cận/bước/đảo, duyệt/enumerate | c8-co-ban |
| 8 / 9–11 | Nối/lặp/in/so sánh, f-string/format/%, số thập phân/nhóm nghìn/căn lề/ngoặc literal | c8-toan-tu |
| 8 / 13–15 | find/rfind/count/startswith/endswith, hoa/thường/title/capitalize/swapcase, strip/lstrip/rstrip, replace, split/join, các phép is*, ljust/rjust/center/zfill, prefix/suffix, partition, translate, encode | c8-phuong-thuc, c8-van-dung |
| 8 / 17–26 | Pipeline chuẩn hóa; bẫy find và ghép số; đếm từ/chuỗi con, tần suất, palindrome, quy ước đếm câu, Caesar ASCII và khóa ngược | c8-van-dung |
| 9 / 4–30 | List hỗn hợp/lồng/rỗng, range, len, chỉ số/gán/duyệt, nối/slice, append/extend/insert/count/index/in, min/max/sum, sort/sorted, remove/pop/del/reverse, chuỗi↔list | c9-list |
| 9 / 31–40 | Alias/is, copy/slice nông, list con dùng chung, clear khác gán lại, sửa khi duyệt, lọc mới, array.array, comprehension và ma trận nhiều hàng | c9-tham-chieu |
| 9 / 40–43 | Tích vô hướng, đoạn con liên tiếp (nêu rõ không phải tập con), tích Descartes, tổ hợp, cộng từng phần tử khác nối, nhân ma trận/kích thước | c9-tham-chieu |
| 9 / 45–56 | Tuple bất biến có thể chứa mutable, count/index, tuple một phần tử, hiệu năng không tuyệt đối, unpack/swap, divmod, trả nhiều giá trị, zip iterator/dừng ngắn, so sánh từ điển | c9-tuple |
| 9 / 57–62 | dict.items view, sắp cặp khóa–giá trị, đảo (value,key)/xử lý hòa, top từ, dừng trước tuple đầu, sắp nhiều tiêu chí | c9-tuple |
| 10 / 4–19 | Module/import/alias/namespace, __name__, argv/path/PYTHONPATH/che tên, pyc, -O/-OO, dir, package/__init__.py/namespace package, __all__ | c10-module |
| 10 / 21–27 | random/seed/range/choice/shuffle, bảo mật secrets, perf_counter/benchmark, lượng giác radian/asin/log, phương trình suy biến, số lần chia đôi | c10-thu-vien, c10-tep |
| 10 / 28–43 | NumPy khác list, shape/ndim/size, indexing/slicing view/mask, broadcasting, dtype và tràn, Numba/warmup, zeros/ones/eye/arange/linspace/rand, reshape/stack, axis/mean/std/argmax, @, det/eig/norm/inv/solve, chuẩn hóa/threshold | c10-numpy, c10-tep |
| 10 / 45–67 | Handle/mode r/w/a/r+/binary, encoding/newline, read/cursor/duyệt streaming, tiền tố dòng, rstrip, print/end, lỗi mở tệp, with/close, write ký tự, seek/tell | c10-tep |
| 10 / 68–69 | CSV quoting/DictReader/DictWriter/header/newline/chuyển kiểu; pathlib đường dẫn/cwd/stem/suffix/parent/mkdir/glob | c10-tep, c10-du-lieu |
| 10 / 71–80 | JSON dump(s)/load(s), true/null, tuple→list/khóa chuỗi, indent/schema, pickle nhị phân/đặc thù Python/giới hạn/bảo mật/cPickle cũ | c10-du-lieu |
| 10 / 81–82 | So sánh tệp không phá đầu vào, đọc cuối n dòng và n=0, tần suất/JSON, CSV tính điểm/ranking, cấu hình/ngưỡng lọc | c10-tep, c10-du-lieu |
| 11 / 5–22 | Môi trường Turtle/Tk; tọa độ standard, forward/backward/turn/goto/home/setx, position/heading/isdown, pensize/penup, speed, RGB/colormode, fill, circle, write, ẩn rùa | c11-turtle |
| 11 / 24–35 | Đa giác góc ngoài, vòng màu/xoắn ốc, nhiều rùa, spirograph, cây đệ quy/trả trạng thái, callback bàn phím/chuột/listen, event loop, setup/screensize/bgpic, clear/reset, nhà và sao | c11-turtle, c11-su-kien |
| 11 / 37–50 | Matplotlib/pyplot/OO, Figure/Axes, sin/cos/linspace, figsize/dpi/subplot, plot x/y, màu/nét/marker/linewidth, legend/grid, title/labels/limits/ticks, bar/barh, savefig/show | c11-matplotlib |
| 11 / 52–63 | Pie/autopct, scatter/s/tương quan, histogram bins/density, boxplot Q1/Q3/median/IQR/râu/outlier, subplots/layout/suptitle, style, annotate, imshow/colorbar, errorbar, 3D, ngày và chuỗi thời gian | c11-matplotlib |
| 12 / 4–16 | Hệ thống công nghệ số, CPU/CU/ALU/RF/BIU, GPU/song song, NPU/ma trận, SoC, giới hạn so sánh TOPS | c12-phan-cung, c12-ai |
| 12 / 18–25 | AI–ML–DL, luật vs học dữ liệu, supervised phân loại/hồi quy, unsupervised phân cụm, RL/phần thưởng dài hạn, nơ-ron/trọng số/lớp ẩn/biểu diễn | c12-ai |
| 12 / 26–31 | Generative AI, LLM/token/next-token, prompt/context/schema, hallucination/kiểm nguồn, bias/deepfake/privacy, minh bạch/trách nhiệm/giám sát | c12-genai |
| 12 / 33–41 | IoT/cảm biến/chấp hành, bốn lớp, luồng dữ liệu, hạn chế cloud, edge, Edge AI khác luật cục bộ, phối hợp cloud/edge, phản ứng xe tự hành | c12-iot |
| 12 / 44–50 | 5V, tính lượng dữ liệu có giả thiết overhead, vòng đời, HDFS/phân khối/sao chép/giới hạn chịu lỗi, Map–shuffle–Reduce, gợi ý/giao thông, chất lượng/riêng tư | c12-bigdata |
| 12 / 52–63 | Sổ cái/hash/liên kết/va chạm, đồng thuận, PoW/PoS/hiệu năng, quyền đọc/bất biến tương đối/khóa, smart contract/oracle, crypto vs blockchain, chọn use case, token hóa/DeFi, nguồn gốc/văn bằng và dữ liệu ngoài chuỗi | c12-blockchain |

## Những điểm không chép nguyên lỗi hoặc khẳng định quá rộng của slide

- Python: `**` kết hợp phải; `//` lấy sàn (cả số âm); `int` không bị giới hạn 32 bit như một số kiểu máy. GIL chỉ nói rõ trong bối cảnh CPython có GIL bật.
- Chương 6: tổng `[9,41,12,3,74,11]` là **150**, trung bình **25**, không dùng số 154 trên slide. `elif` không bắt buộc có điều kiện loại trừ nhau. `line[0]` cần tránh khi chuỗi rỗng.
- Chương 7: biến cục bộ không tự trở thành giá trị trả về; thiếu `return` trả `None`. Hàm đổi nhị phân và giai thừa có miền/cơ sở rõ. Fibonacci giữ **F(0)=F(1)=1** theo bài, Pascal hàng 5 sửa thành **1,4,6,4,1**. Công thức một hình thang là xấp xỉ; không khuyến khích `eval` đầu vào lạ.
- Chuỗi là Unicode, không khẳng định mọi `str` được lưu nội bộ bằng UTF-8. `isidentifier()` không loại từ khóa. Đếm từ/câu nêu rõ quy ước, không đồng nhất tách khoảng trắng với phân tích ngôn ngữ.
- List copy/slice là sao chép nông; tuple có thể tham chiếu đối tượng mutable. `dict.items()` là view, `zip` là iterator.
- Package thường dùng **`__init__.py`**; có ngoại lệ namespace package. Cache hiện đại là `.pyc` trong `__pycache__`, không dạy `.pyo` như yêu cầu Python 3 hiện tại. `random` không dành cho bí mật xác thực; pickle lạ không được tải trực tiếp. [Tài liệu mô-đun Python](https://docs.python.org/3/tutorial/modules.html), [cảnh báo pickle](https://docs.python.org/3/library/pickle.html).
- NumPy: chuyển kiểu **trước** phép cộng để tránh tràn; reshape không luôn là view; broadcasting xét từ phải. Thời gian benchmark/Numba không là bảo đảm hiệu năng trên mọi máy. [Quy tắc broadcasting](https://numpy.org/doc/stable/user/basics.broadcasting.html).
- Tệp nhị phân 16 byte muốn lấy 3 byte cuối dùng **`seek(-3,2)`**. `tell` của tệp văn bản không tùy tiện coi là số ký tự. CSV cần parser xử lý nháy, JSON hợp lệ chưa chắc đạt schema ứng dụng.
- Turtle: pensize mặc định **1**; `speed(0)` tắt hoạt ảnh, dải **1 chậm → 10 nhanh**; câu tọa độ nêu chế độ standard. Turtle cần Tk, không hứa thực hành Turtle chuẩn trong Pyodide. [Tài liệu Turtle](https://docs.python.org/3/library/turtle.html).
- Matplotlib: `dpi=80`, không phải `dpi-80`; marker `s` là diện tích; histogram mật độ chuẩn hóa **diện tích**. Râu boxplot theo 1,5 IQR không nhất thiết đến min/max, outlier không mặc nhiên là dữ liệu sai. [Histogram](https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.hist.html), [boxplot](https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.boxplot.html).
- Chương 12: không lấy cấu hình chip/số phiên bản/số TPS theo thời điểm làm chân lý phổ quát. Phân biệt edge với Edge AI, đồng thuận với tính đúng ngoài đời, chống sửa đổi với “không thể sửa trong mọi điều kiện”, token với quyền tài sản ngoài chuỗi. [Tổng quan blockchain NIST](https://www.nist.gov/blockchain), [kiến trúc HDFS](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html).

## Kiểm tra và bảo trì

- 243 đoạn mã/phép tính chạy bằng Python; các câu `kind=code` đều có fixture khớp **đúng mã hiển thị**, không chỉ so đáp án chép lại. NumPy chạy trên thư viện thật. Mỗi đoạn có tiến trình riêng, thư mục tạm và timeout 10 giây; đây không phải sandbox an toàn cho mã lạ.
- 16 phép kiểm số học/đồ họa độc lập, cùng kiểm tra Pascal và tọa độ cung tròn. Câu Turtle kiểm tra bằng quy tắc tọa độ/hình học và tài liệu; không khởi chạy GUI Tk trong CI. Câu Matplotlib khái niệm không được tuyên bố là đã chạy render từng hình.
- Kiểm tra JSON/schema tham chiếu, ID/đề/lựa chọn không trùng trong chương, tất cả nhóm có câu, cân bằng vị trí đáp án A–D (chênh tối đa 1 trong từng chương), không có đáp án đúng dài bất thường theo ngưỡng kiểm thử. Kiểm tra tự động không thay thế rà soát ngữ nghĩa phương án nhiễu.
- Bộ kiểm thử hiện có tiếp tục kiểm tra chấm số/trắc nghiệm, lưu tiến độ, chuyển bộ lọc, ghim, trộn và tách kết quả thi theo chương. Giữ nguyên khóa lưu tiến độ `it1140-quiz-state:v2`.
- Cập nhật CSS giữ nguyên thụt lề Python, manifest v8 và cache tĩnh v17 để trình duyệt nhận ngân hàng mới. Không bổ sung cơ sở dữ liệu hay dịch vụ phía máy chủ.
