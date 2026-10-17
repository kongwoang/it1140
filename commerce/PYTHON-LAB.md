# Thực hành Python: nội dung riêng tư và hỗ trợ người mới

## Bộ bài

Baseline trong Git công khai giữ nguyên 70 bài theo `IT1140_Tai_lieu_Giang_vien.pdf` mà chủ dự án cung cấp. Đây là tài liệu thực hành, **không phải bằng chứng các bài đã được dùng trong kỳ thi HUST**.

Bộ thương mại tại `commerce/vm/deploy/content/python-exercises.json` gồm 200 bài: 70 bài trên và 130 bài bổ sung tự biên soạn. Có 20 bài biểu thức/rẽ nhánh, 25 bài vòng lặp/số học, 25 bài chuỗi, 30 bài dãy/ma trận/từ điển, 15 bài tệp/CSV/JSON và 15 bài thư viện/biểu đồ. Một số bài cơ bản có chủ đích; không coi mọi bài là đề thi có cùng độ khó. Đã thay các bài bổ sung trùng nhiệm vụ với baseline thay vì chỉ đổi số liệu.

Bộ riêng tư và các nguồn soạn/lời giải trong `content/authoring/` đều được gitignore/dockerignore. **Clone Git không lấy được 130 bài mới.** Khi deploy, sao chép riêng các tệp nội dung bằng kênh quản trị tin cậy rồi mount `COURSE_DATA_DIR` read-only. Không copy lời giải tham chiếu vào public assets, không force-add thư mục này vào Git công khai. Phải có bản sao lưu riêng cho nội dung; backup PostgreSQL không chứa ngân hàng câu hỏi hoặc bài Python.

Mỗi bài bổ sung có đầu vào, đầu ra, giới hạn, quy tắc hòa/trường hợp rỗng khi phù hợp, ví dụ định dạng monospace và ít nhất 4 ca kiểm tra. 520 kết quả kỳ vọng được chỉ định riêng rồi chạy đối chiếu lời giải tham chiếu bằng Python cục bộ. Bài biểu đồ chấm dữ liệu và nhãn trên Figure, không đòi tên biến cụ thể. Đây là kiểm tra chất lượng bài, không phải bảo đảm mọi lời giải sai đều bị phát hiện; test được đưa xuống trình duyệt, không phải hidden judge chống gian lận.

Học thử là allowlist cố định `content/preview-access.json`: 210/2096 câu và 20/200 bài. Không tự bốc 10% mới mỗi lần truy cập. Bản trong Git dùng 7/70 vì không mang theo bộ riêng tư. Cần chuyển manifest cùng bộ dữ liệu.

## Tham khảo và xuất xứ

Trang [lab.soict.ai](https://lab.soict.ai/) có nội dung yêu cầu đăng nhập. Không lấy nội dung riêng tư, không xác nhận được các bài thi sau đăng nhập. Mỗi bài mới được ghi rõ là bài luyện tự biên soạn, không gắn nhãn đề thi HUST.

Các dạng công khai được tham khảo để viết lại bài tiếng Việt và tự đặt dữ liệu/giới hạn: [Missing Number](https://cses.fi/problemset/task/1083), [Repetitions](https://cses.fi/problemset/task/1069), [Increasing Array](https://cses.fi/problemset/task/1094), [Trailing Zeros](https://cses.fi/problemset/task/1618), [Distinct Numbers](https://cses.fi/problemset/task/1621). Không sao chép nguyên bộ đề hoặc lời giải từ các trang này.

Đối chiếu hành vi thư viện với tài liệu chính thức: [Python control flow](https://docs.python.org/3.14/tutorial/controlflow.html), [cấu trúc dữ liệu](https://docs.python.org/3.14/tutorial/datastructures.html), [CSV](https://docs.python.org/3.14/library/csv.html), [Decimal](https://docs.python.org/3.14/library/decimal.html), [NumPy clip](https://numpy.org/doc/stable/reference/generated/numpy.clip.html), [pandas groupby](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.groupby.html), [Matplotlib plot](https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.plot.html).

Trước khi bán, chủ website vẫn cần xác nhận quyền khai thác thương mại tài liệu/nội dung. Việc các bài cũ từng công khai không biến chúng thành nội dung chưa từng bị sao chép.

## IDE và lỗi

- Tab thêm dấu cách tới cột thụt lề kế tiếp (bước 4). Chọn nhiều dòng rồi Tab/Shift+Tab để tăng/giảm lề, không làm mất phần chọn.
- Enter tự giữ thụt lề, tăng lề sau dấu mở khối; ghép ngoặc/nháy; Backspace xử lý cặp dấu và nhóm dấu cách. Ctrl/⌘+/ bật/tắt chú thích; Ctrl/⌘+Z và redo khôi phục thay đổi trong bài hiện tại. Bộ nhớ lịch sử có giới hạn.
- Cảnh báo nhanh cho ngoặc/nháy chưa đóng và Tab thật; đây là kiểm tra từ vựng nhẹ, không thay thế trình biên dịch Python, nhất là cú pháp mới/f-string phức tạp.
- Khi chạy, compile với tên `main.py`; lỗi có loại, dòng/cột, giải thích tiếng Việt, nút tới dòng và traceback mở rộng. Không nhảy tới dòng cũ nếu mã đã được sửa trong lúc chạy.
- Sai kết quả: chỉ ra dòng đầu tiên khác, cần in/đã in, stdin của ca. Phân biệt chưa tạo tệp, tệp không đọc được UTF-8 và sai nội dung tệp.
- `input()` và `sys.stdin` đọc cùng luồng. `sys.exit(0)` kết thúc bình thường. Thu đầu ra tối đa 200000 ký tự; worker bị dừng sau 60 giây. Các giới hạn này giữ trình duyệt ổn định hơn, không phải sandbox tài nguyên tuyệt đối.
- Chuyển bài hủy lượt chạy cũ để không đánh dấu hoàn thành nhầm bài. Nếu sửa mã trong lúc kiểm tra, kết quả đúng của bản cũ không tự đánh dấu hoàn thành bản mới.

## Kiểm chứng

```sh
npm run build --prefix commerce
HTTP_SMOKE=true npm test --prefix commerce
npm run test:prototype --prefix commerce
node scripts/validate-data.mjs
node scripts/test-quiz.mjs
```

Với bộ riêng tư trên máy chủ dự án (chạy từ thư mục gốc):

```sh
node scripts/validate-data.mjs --python-file commerce/vm/deploy/content/python-exercises.json
COURSE_DATA_DIR=/absolute/path/to/content HTTP_SMOKE=true npm test --prefix commerce
COURSE_DATA_DIR=/absolute/path/to/content npm run preview --prefix commerce
```

`content/authoring/build.mjs` kiểm lại các kết quả rồi tạo JSON/manifest riêng tư; cần Python có NumPy, pandas, Matplotlib. Dùng `TEST_PYTHON` để chỉ định Python ở môi trường kiểm thử riêng. Script không chạy trong web server và không dùng để chạy mã của người học trên máy chủ. CI công khai kiểm code/baseline; 520 ca của bộ riêng tư được kiểm cục bộ, không công bố trong log CI.

Chưa dùng các kết quả trên để tuyên bố đã thử tải 1000 người đồng thời, đã gửi mail thật, nhận tiền thật hay triển khai production.
