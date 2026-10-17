# Biên tập ngân hàng câu hỏi

## Tiến độ

Đã hoàn thành **một lượt đọc và biên tập 2.096 câu của cả 12 chương**, tiếp nối đợt mẫu 50 câu chương 1. Nội dung mới nằm trong bộ riêng tư tại `vm/deploy/content/`, không thay bộ đề GitHub Pages.

So với bộ công khai: **439 câu thay câu dẫn/phương án/lời giải; 862 câu chỉ đổi mức khó; 795 câu được giữ nguyên**. Giữ nguyên ID, khóa đáp án, chương, nhóm, loại câu và các trường liên kết. Các câu có mã đã đủ ngữ cảnh không bị viết lại chỉ để tăng số câu thay đổi.

Đã đối chiếu lời giải khi sửa phương án, rà riêng cả 96 câu nhiều đáp án, sửa các lời giải nhắc sai thứ tự lựa chọn. Đối chiếu 738 chương trình hiển thị với mã kiểm thử; chạy đạt 776 ca Python/NumPy và 171 phép kiểm tra số học/thuật toán độc lập trên bộ riêng tư. Còn có kiểm tra phép tính theo từng đợt và kiểm tra độ dài đáp án đúng quá nổi bật. Các phép kiểm tra này không chứng minh tuyệt đối rằng mọi câu hoàn hảo.

| Chương | Đã đọc | Có sửa câu chữ/phương án/lời giải |
| --- | ---: | ---: |
| 1 | 208 | 110 |
| 2 | 208 | 72 |
| 3 | 248 | 60 |
| 4 | 218 | 45 |
| 5 | 118 | 33 |
| 6 | 158 | 12 |
| 7 | 158 | 12 |
| 8 | 158 | 8 |
| 9 | 158 | 9 |
| 10 | 208 | 24 |
| 11 | 128 | 27 |
| 12 | 128 | 27 |

Độ khó là phân loại biên tập theo thao tác cần thực hiện, chưa được hiệu chỉnh từ kết quả làm bài thực tế của sinh viên hoặc hội đồng ra đề. Không gắn nhãn đề thi HUST thật. **200 bài thực hành Python không được biên tập lại trong lượt rà ngân hàng trắc nghiệm này.**

## Quy tắc cho các đợt tiếp theo

- Câu dẫn hỏi một việc cụ thể, đủ dữ kiện: cơ số, độ rộng bit, có dấu/không dấu, quy tắc làm tròn hoặc quy ước đơn vị nếu kết quả phụ thuộc chúng. Không bắt người học đoán ngữ cảnh của câu trước.
- Diễn đạt theo thuật ngữ bài giảng, ngắn và tự nhiên; tránh câu chuyện dài không phục vụ kiến thức cần kiểm tra. Không thêm từ khó để nâng mức khó.
- Phương án nhiễu dựa vào lỗi có thể mắc: nhầm bit/byte, thứ tự đổi cơ số, có dấu/không dấu, nhớ/tràn, ký tự/giá trị. Các phương án cùng kiểu, cùng đơn vị và tương đương về cách trình bày. Tránh một đáp án dài hoặc cụ thể nổi bật hẳn.
- Tính lại đáp án sau khi đổi dữ kiện; kiểm tra cả phương án sai, đặc biệt câu nhiều đáp án và các từ “luôn”, “chỉ”, “không”. Lời giải phải phù hợp các phương án mới.
- Mức 1: nhớ/hiểu hoặc một thao tác trực tiếp; mức 2: áp dụng, đối chiếu hay nhiều bước quen thuộc; mức 3: thực sự cần kết hợp kiến thức hoặc lập luận thêm. Câu cơ bản đúng mục đích không nhất thiết phải làm khó hơn.
- Dùng backtick cho đoạn mã, biểu thức bit hoặc giá trị cần font code. Không đổi chỗ đáp án chỉ để cân bằng chữ cái nếu ảnh hưởng tiến độ cũ.
- Không ghi “đề thi HUST” nếu chưa đối chiếu được đề gốc. Không dùng thay từ hàng loạt làm bằng chứng đã thẩm định toàn bộ ngân hàng.

## Áp dụng một đợt có kiểm soát

Từ gốc repository, kiểm tra cả bộ riêng tư:

```sh
node scripts/validate-data.mjs \
  --subject-file commerce/vm/deploy/content/subjects/it1140.json \
  --python-file commerce/vm/deploy/content/python-exercises.json
```

Để chạy các ca mã và phép tính đã có trong repository với đáp án của bộ riêng tư (cần Python cùng NumPy):

```sh
python3 scripts/test-python-quiz.py \
  --bank commerce/vm/deploy/content/subjects/it1140.json
python3 scripts/test-question-calculations.py \
  --bank commerce/vm/deploy/content/subjects/it1140.json
```

Hai công cụ chỉ chạy mã kiểm thử cố định trong `scripts/fixtures/`, không thực thi mã lấy từ ngân hàng tùy ý. Bỏ `--bank` vẫn kiểm tra bộ công khai như trước. Các kiểm tra JS cũ có nhiều câu chữ cố định, không dùng việc chúng đạt trên bộ công khai để tuyên bố bộ riêng tư đã đạt. Biên bản và trình kiểm tra toàn lượt riêng nằm tại `vm/deploy/content/authoring/review-all-verification.json` và `verify-all-reviewed.mjs`.

`scripts/review-question-bank.mjs` nhận một kế hoạch JSON gồm 1–100 thay đổi đã được người biên tập chọn rõ. Mỗi dòng có `id`, `reason`, `beforeSHA`, `afterSHA` và `fields` (chỉ `prompt`, `choices`, `explanation`, `difficulty`). SHA-256 tính từ `JSON.stringify(question)` bằng hàm `fingerprint` được export. Không cho sửa ID, khóa đáp án hoặc loại câu qua công cụ này. Đổi khóa đáp án cần quy trình sửa lỗi riêng, không lách qua đợt biên tập.

```sh
node scripts/review-question-bank.mjs \
  --bank commerce/vm/deploy/content/subjects/it1140.json \
  --python commerce/vm/deploy/content/python-exercises.json \
  --plan commerce/vm/deploy/content/authoring/selected-plan.json \
  --audit commerce/vm/deploy/content/authoring/unique-audit.json
```

Công cụ từ chối nội dung đã đổi kể từ lúc lập kế hoạch, kiểm tra toàn bộ cấu trúc, lưu bản trước/sau vào audit mới (mode 600, không ghi đè), rồi thay file qua tệp tạm cùng thư mục. Chạy lại đợt đã áp dụng là no-op. Audit có thể đã được ghi nếu thao tác bị gián đoạn trước khi thay ngân hàng: đối chiếu `bankBeforeSHA`/`bankAfterSHA`, không chỉ dựa vào việc audit tồn tại.

Kế hoạch, audit và biên bản kiểm tra của bộ thương mại phải ở thư mục riêng tư, không đưa lên Git công khai. Sao lưu trước/sau; khởi động lại preview sau khi sửa vì ngân hàng được đọc lúc khởi động. Không thay allowlist miễn phí chỉ để xem câu vừa sửa.
