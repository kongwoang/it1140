# IT1140 · Bản thương mại trên VPS/AWS/Azure

Bản chuẩn: **Node.js 24+ + PostgreSQL 17 + SMTP + Caddy HTTPS**. Không cần Supabase. Giá server **20.000đ một lần**, quyền IT1140 không tự hết hạn. **MB + SePay HMAC webhook**; mặc định tắt thanh toán. GitHub Pages vẫn dùng bản tĩnh, không chạy backend này. Theo yêu cầu ngày 20/10/2026, bộ 2.096 câu đã rà soát và 200 bài Python được đồng bộ vào dữ liệu công khai.

Các file Worker/Supabase ở thư mục commerce là nguyên mẫu đối chiếu/kiểm thử. Worker mặc định đã trả 503 để không vô tình mở lại API toàn bộ đáp án. **Không deploy bằng Wrangler**; dùng `vm/deploy/compose.yml`.

## Chức năng

- OTP email HUST: mặc định đúng domain `sis.hust.edu.vn`, `hust.edu.vn`; 6 số ngẫu nhiên, hiệu lực 10 phút, tối đa 5 lần thử, dùng một lần và ràng buộc trình duyệt xin mã. Xin lại mã chỉ vô hiệu mã chưa xác minh của chính hồ sơ đó, không vô hiệu mã đang ở trình duyệt khác. Production bắt buộc Turnstile xác minh server-side, đúng hostname/action `otp`, token dùng một lần. Rate limit email/IP/tổng số thư; yêu cầu bị từ chối bởi cooldown không trừ ngân sách thư chung. Database lưu HMAC mã, không lưu/ trả OTP gốc trong API hoặc log production.
- Phiên opaque 7 ngày, băm trong database, cookie HttpOnly/Secure/SameSite=Lax; mỗi request phải có cả cookie phiên và cookie hồ sơ khớp DB. Sao chép riêng cookie phiên bị từ chối. OTP lại xoay phiên trên hồ sơ trình duyệt đó. Không thu mật khẩu trường. **Chưa có Microsoft OAuth** vì chưa có app Entra được kiểm tra với HUST.
- Tối đa 2 hồ sơ trình duyệt; hồ sơ thứ ba xác minh OTP rồi chọn thay thế. Tối đa 2 lần tự thay/thu hồi trong 30 ngày. Thao tác nhạy cảm cần xác minh trong 10 phút gần nhất; CLI hỗ trợ có audit.
- Một phiên học hoạt động: lease 5 phút, heartbeat khoảng mỗi phút có jitter. Chuyển phiên chủ động; phiên cũ bị từ chối ở các yêu cầu tiếp theo. Nhiều tab cùng phiên không bị tính thành nhiều người. Không khóa IP hay fingerprint.
- Cấp tối đa 20 câu/lần, không kèm đáp án/giải thích. Chấm hoặc xem lời giải một câu ở server sau khi được cấp câu đó. Thi có phạm vi cố định trong DB, tối đa 100 câu (UI 40), nộp một lần, retry trả kết quả cũ. Giữ 2.096 câu, điền số, nhiều đáp án, chương/tìm/ghim/trộn và tiến độ cục bộ.
- Python giữ IDE, kiểm tra, file mẫu, gợi ý, tải .py; tải chi tiết khi chọn bài. Bộ công khai và runtime hiện cùng có 200 bài, xem [PYTHON-LAB.md](PYTHON-LAB.md). Code chạy trong worker của iframe opaque-origin (`sandbox allow-scripts`, không `allow-same-origin`), CSP chỉ cho tải môi trường Pyodide đã ghim phiên bản, không cho gọi API tài khoản. Giao tiếp qua MessageChannel riêng, đầu ra được giới hạn và lọc. Không chạy code Python trên backend thanh toán. Điểm Python cục bộ không phải điểm thi đáng tin cậy.
- Giá, owner, người nhận lấy từ server. QR riêng, hạn 30 phút. HMAC raw body + timestamp, giao dịch trùng không cấp hai lần; ledger/paid/quyền học cùng transaction. Đúng bank/account/mã/tiền/chiều/thời gian mới cấp; sai vào đối soát. Webhook trễ nhưng tiền vào đúng hạn vẫn hợp lệ.
- Public build không có data JSON/SQL/env/key. Chỉ CSS/JS không cá nhân hóa được cache công khai 5 phút; HTML/API/service worker giữ private/no-store. Service worker thương mại không cache API và thay cache cũ. Tiến độ/mã lưu theo ID tài khoản trên thiết bị, **chưa đồng bộ cloud**.
- Container app non-root/read-only, DB và app không mở cổng công khai; runtime DB role không phải owner. Migration riêng có checksum, health/preflight, CLI, backup/restore và bộ tải staging.

## Học thử miễn phí

Trang `/preview` mở không cần tài khoản: **210/2.096 câu** chia đều theo tỷ lệ từng chương và **20/200 bài Python**. Có Luyện/Ôn/Thi và IDE cách ly như bản đầy đủ. Trang tài khoản và trang học thử có nút mở toàn bộ nội dung với giá 20.000đ một lần. Tổng số bài hiển thị lấy từ API, không ghi cứng số bài.

Danh sách miễn phí là allowlist **cố định** trong `vm/preview-access.json`, chỉ chứa ID. Không chọn ngẫu nhiên lại bộ miễn phí theo lượt tải, thiết bị hoặc tài khoản. `Trộn`, tìm kiếm và phân trang chỉ hoạt động trong tập đã chọn. Có thể chỉnh allowlist tại `COURSE_DATA_DIR/preview-access.json` trên VM (ưu tiên hơn bản mặc định); `init-content` sao chép bản khởi đầu. ID phải tồn tại, không trùng và không vượt khoảng 12% tổng nội dung; app fail-closed nếu cấu hình không hợp lệ. Khi thay bộ đề/private ID, cập nhật file này cùng lúc. Bộ hiện tại có cả chọn một/nhiều đáp án, điền số và bài Python qua 5 phần.

API công khai chỉ ở `/api/preview/*`, không tạo người dùng/đơn/quyền học/lease và không ghi lượt làm bài vào DB. Mỗi endpoint lấy câu, chấm, xem lời giải và tải bài Python đều kiểm tra allowlist server-side. API `/api/course/*` vẫn yêu cầu tài khoản đã mua và phiên học hợp lệ. Không có cờ `free`, `paid` hoặc `percent` từ client để mở phần trả phí.

Thi thử miễn phí dùng token HMAC riêng mục đích, có tập ID cố định và hạn 24 giờ; không thể dùng làm ID thi trả phí hay thông tin đăng nhập. Điểm học thử lưu cục bộ theo phạm vi riêng, không có kết quả thi chính thức/bất biến ở DB; submit lại chỉ chấm các câu miễn phí. Có rate limit IP trong bộ nhớ, giới hạn số bucket; cần WAF/rate limit tại proxy khi triển khai nhiều replica hoặc chống lạm dụng phân tán. HTML/API vẫn no-store; asset gắn hash phiên bản và service worker cũ được thay trước khi học thử.

## Giới hạn trước khi bán

Không thể bảo đảm “không hack được” hoặc chống chia sẻ tuyệt đối. Hồ sơ trình duyệt dựa vào cookie, không chứng minh máy vật lý. Người mua vẫn có thể chuyển OTP/copy cookie/học luân phiên/chụp màn hình/tích lũy câu hỏi qua API hợp lệ. Logout không thu hồi được tài liệu đã hiển thị.

Ngân hàng hiện đã công khai trên GitHub/Pages; private repo/paywall không thu hồi bản sao cũ. Phải xác nhận quyền bán tài liệu/nội dung. Không quảng cáo bộ hiện tại là chưa từng công khai. Production nạp `COURSE_DATA_DIR` qua volume read-only, không đóng gói data/ hay đáp án trong Docker image. Chỉnh bộ thương mại mới trong `commerce/vm/deploy/content/` (gitignore/dockerignore), không chỉnh bản tracked `data/` nếu muốn giữ riêng tư. Việc chuyển repository thành private hoặc gỡ website miễn phí cần chủ website quyết định riêng.

`vm/public/legal.html` là bản **chờ chủ website biên tập** thông tin người bán, quyền riêng tư, hoàn tiền, phạm vi và việc duy trì quyền học. Chưa có hoàn tiền/hóa đơn tự động hoặc admin web; dùng CLI qua SSH. Không mở bán chỉ bằng cách đổi cờ mà chưa hoàn thiện chính sách.

## Kiểm tra cục bộ

Quy trình và tiến độ biên tập câu hỏi: [QUESTION-EDITING.md](QUESTION-EDITING.md). Nội dung mới được sửa trong bộ riêng tư; không sửa đồng loạt bộ công khai bằng thay từ tự động.

Từ gốc repository:

```sh
npm ci --prefix commerce --ignore-scripts
npm run build --prefix commerce
npm test --prefix commerce
npm run check:deploy --prefix commerce
npm audit --prefix commerce --omit=dev
npm run preview --prefix commerce
```

Preview bind 127.0.0.1:4180, DB PGlite tạm, không gửi thư hay nhận tiền thật. `PREVIEW_INTERACTIVE=true` bật tài khoản giả `preview@sis.hust.edu.vn` có quyền giả trong **DB tạm**, email giả lưu trong thư mục tạm riêng in lúc khởi động; không có endpoint xem OTP. Không dùng preview làm production; không có cờ bypass OTP/quyền trong app production.

SQL nghiệp vụ được kiểm tra trên PostgreSQL WASM (PGlite), không phải mô phỏng bằng JS. Test PostgreSQL native chỉ chạy khi có `TEST_DATABASE_URL` và `ALLOW_TEST_DATABASE_CREATE=true`; tạo rồi xóa đúng database ngẫu nhiên `it1140_test_*`. Không trỏ test tới server production. CI có PostgreSQL thật để test slot/lease/webhook cạnh tranh, Docker build và Compose.

## Chuẩn bị VM Linux

2 vCPU/2 GB là **cấu hình ứng viên thử tải**, không phải cam kết 1.000 người. Không cài đầy đủ Supabase vào máy nhỏ. Ưu đãi AWS/Azure có điều khoản, quota, CPU credit và hạn dùng: xác minh tài khoản trước khi tạo tài nguyên.

- Ubuntu/Debian còn hỗ trợ; Docker Engine + Compose từ nguồn chính thức.
- Mở TCP 80/443, UDP 443 tùy chọn; SSH chỉ IP quản trị, SSH key/MFA cloud. Không mở 4180/5432.
- Cập nhật OS/image, sao lưu ngoài máy, theo dõi disk/CPU/RAM/CPU credit và billing.
- Clone source lên VM, tạo subdomain staging trước, chưa đổi domain đang chạy.

## Triển khai staging

Từ gốc repo, tạo secrets một lần:

```sh
npm ci --prefix commerce --ignore-scripts
node commerce/vm/ops.mjs init-secrets
node commerce/vm/init-content.mjs
cp commerce/vm/deploy/.env.example commerce/vm/deploy/.env
```

Init không in secret và không ghi đè. Secrets directory chỉ chủ máy truy cập. Container Node dùng UID 1000: bảo đảm file secrets app/migrate và content có owner 1000 và mode 600, thư mục content và subjects mode 700; nếu tạo bằng root thì chown đúng từng file/thư mục đã kiểm tra. Không chmod đọc rộng. `init-content` chỉ sao chép bộ đã công khai làm điểm bắt đầu, từ chối ghi đè; nó không biến dữ liệu lịch sử thành bí mật. Mất mật khẩu DB không được khắc phục bằng tạo file khác; đổi file secret không tự đổi password trong PostgreSQL.

Sửa .env trên VM: DOMAIN/ACME_EMAIL, SMTP host/port/user/from, email hỗ trợ. Điền password vào `deploy/secrets/smtp_password`; cấu hình SPF/DKIM/DMARC và thử email HUST. Secret `sepay_secret` phải khớp SePay. Giữ PAYMENTS_ENABLED=false, SELLER_READY=false. Không gửi secrets/OTP vào chat/Git/screenshot. Chính chủ tự liên kết MB và nhập OTP trực tiếp tại dịch vụ chính thức.

Tạo Turnstile widget Managed với allowlist **đúng hostname staging/production**, không dùng Any Hostname. Điền site key công khai vào TURNSTILE_SITE_KEY và secret vào `deploy/secrets/turnstile_secret`; không dùng test key ở production. Không cần chuyển nameserver hay bật Cloudflare proxy. App xác minh token qua Siteverify, kiểm tra hostname và action `otp`, fail-closed khi dịch vụ lỗi. Bổ sung việc sử dụng dịch vụ chống bot của Cloudflare trong chính sách quyền riêng tư. Xem [xác minh phía server](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) và [CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/).

Nếu đã có bộ secrets từ phiên bản trước, **không chạy lại init-secrets hoặc đổi password DB**. Tạo riêng file turnstile_secret còn thiếu bằng chế độ exclusive/mode 600, nhập secret trực tiếp trên VM; tạo content bằng init-content nếu thư mục chưa có. Preflight sau đó phải đạt cả SMTP và chống bot. Fixture load test cũ chỉ chứa cookie phiên không dùng được nữa: tạo fixture mới trên DB thử tải trống.

```sh
cd commerce/vm/deploy
docker compose --env-file .env config --quiet
docker compose --env-file .env build
docker compose --env-file .env up -d db
docker compose --env-file .env run --rm migrate
docker compose --env-file .env run --rm app node commerce/vm/ops.mjs preflight
docker compose --env-file .env up -d app proxy
docker compose --env-file .env ps
```

DNS staging phải trỏ đúng VM, mở cổng để Caddy cấp HTTPS. Preflight kiểm tra runtime role/DB/SMTP, không gửi thư. Dùng DB riêng. Không sửa file migration đã chạy; thêm migration mới.

Webhook SePay: `https://STAGING-DOMAIN/api/webhooks/sepay`, JSON, chiều tiền vào, **HMAC-SHA256**, mã tiền tố IT1140, bật retry/cảnh báo. Đối chiếu gateway/account/time/chữ ký với dữ liệu thực tế trước mở bán. Webhook vẫn nhận đơn cũ khi tạm tắt bán. Không cấp quyền theo ảnh biên lai hoặc callback từ browser.

## Nghiệm thu

- Thư HUST thực sự nhận được; OTP sai/hết hạn/replay/browser khác bị chặn. Turnstile thiếu/sai/đã dùng/khác hostname/action bị chặn; spam xin lại không làm cạn hạn mức chung. Email không tự chứng minh đang còn là sinh viên.
- Hai hồ sơ, một phiên; hồ sơ thứ ba phải thay; thử chuyển phiên/nhiều tab/ngủ máy/mất cookie/Wi-Fi/4G/mất mạng. Không mất mã đang viết.
- Người chưa mua/bị khóa/thu hồi không vào API; đổi ID đơn không đọc đơn khác; giá/account/paid không sửa từ browser. Không lộ answer key trong bundle/catalog.
- Khách vào /preview không cần đăng nhập, làm được câu mẫu và chạy đúng danh sách bài Python miễn phí đã cấu hình; không đọc/chấm ID trả phí qua bất kỳ API preview nào. Reload/Trộn không tăng tập miễn phí; token thi sửa nội dung/hết hạn bị từ chối. Học thử không tạo entitlement hoặc làm mất tiến độ của tài khoản đã mua.
- Luyện/Ôn/Thi/chương/tìm/ghim/trộn; thi không sửa kết quả sau nộp; câu số/nhiều lựa chọn. Python/file mẫu/Matplotlib trên Chrome/Safari/mobile; tải CDN lần đầu cần mạng. Xác nhận worker Python origin `null`, không đọc /api/me và không POST /api/auth/logout được kể cả yêu cầu gửi cookie. Không bỏ sandbox để khắc phục lỗi tải CDN.
- Webhook sai chữ ký/body/timestamp, trùng/cạnh tranh, sai/thiếu/thừa/muộn/hủy và webhook trễ. Ngắt DB rồi retry không cấp trùng.
- Backup/restore và load test trên VM thật. Chủ website hoàn thiện legal/quyền nội dung/liên hệ/chính sách/nghĩa vụ bán hàng.
- Chỉ sau nghiệm thu mới đặt SELLER_READY=true, PAYMENTS_ENABLED=true và restart app. Cutover domain production cần chủ website phê duyệt riêng.

## Thử tải staging

DB riêng kết thúc `_loadtest`, đã migrate và **đang trống**; domain staging, không bật bán. Máy phát tải nên tách khỏi máy đo.

```sh
# Export DATABASE_URL cho DB *_loadtest và APP_ORIGIN cho staging trước.
ALLOW_LOAD_SEED=true PAYMENTS_ENABLED=false LOAD_USERS=1000 node commerce/vm/load/seed.mjs
ALLOW_LOAD_TEST=true VUS=20 DURATION_SECONDS=120 node commerce/vm/load/run.mjs
ALLOW_LOAD_TEST=true VUS=100 DURATION_SECONDS=300 node commerce/vm/load/run.mjs
ALLOW_LOAD_TEST=true VUS=500 DURATION_SECONDS=300 node commerce/vm/load/run.mjs
ALLOW_LOAD_TEST=true VUS=1000 DURATION_SECONDS=1800 node commerce/vm/load/run.mjs
ALLOW_LOAD_TEST=true SPIKE=true VUS=1000 DURATION_SECONDS=300 node commerce/vm/load/run.mjs
```

Fixture giả mode 600/gitignore, phiên hạn 2 giờ; không có production API cấp quyền giả. Bộ tải không gọi SMTP/bank. Nó mô phỏng đề, chấm, heartbeat và tạo/nộp bài dồn, không đo browser rendering hoặc khả năng gửi OTP; quota/deliverability SMTP cần nghiệm thu riêng, không bắn 1.000 thư thật tùy tiện.

Mục tiêu ban đầu p95 <1 giây, lỗi <1%; script in p50/p95/p99/status và exit lỗi nếu không đạt. Đây **chưa phải số đo đã đạt**. Theo dõi CPU/RAM/swap/connections/locks/disk, thử đa chương và chạy dài vài giờ. Không dùng localhost/cache nóng làm bằng chứng cho 1.000 khách. Không đạt thì tối ưu hoặc nâng cấu hình mùa thi.

## Vận hành và khôi phục

CLI chỉ qua SSH, không có endpoint quản trị public:

```sh
docker compose exec app node commerce/vm/ops.mjs status
docker compose exec app node commerce/vm/ops.mjs reviews
docker compose exec app node commerce/vm/ops.mjs prune
```

Prune xóa OTP/rate-limit quá 2 ngày và bài thi luyện quá 30 ngày, không xóa giao dịch/quyền/người dùng. Tự xếp lịch maintenance và backup qua hệ thống vận hành; code không tự cài cron. Theo dõi unhealthy/5xx/DB/SMTP/disk/ledger review và hạn credit. Không bật log cookie/body/OTP.

`reset-devices`, `disable-user`, `restore-user`, `transfer-email` cần `--user UUID --actor TEN_QUAN_TRI --reason LY_DO_CHI_TIET --confirm TEN-LENH-IN-HOA`. Ví dụ confirm RESET-DEVICES, TRANSFER-EMAIL. Email ngoài HUST cần thêm `--allow-external`, chỉ sau khi quản trị xác minh chủ tài khoản và hộp thư mới. Giữ nguyên ID/quyền học, thu hồi phiên cũ và ghi audit; không xin OTP/mật khẩu/cookie của người dùng. Các lệnh này không tự hoàn tiền hay chấp nhận ảnh biên lai.

Dùng pg_dump PostgreSQL 17, format custom/no-owner/no-acl, mã hóa và lưu **ngoài VM**. CLI `backup --file /ABS/PATH/file.dump`, `restore --file /ABS/PATH/file.dump --confirm RESTORE_TO_EMPTY_DATABASE` cần MIGRATION_DATABASE_URL và PostgreSQL client trên máy quản trị. Không đặt mật khẩu trong command line. Restore tới DB **mới đang trống**, không dùng --clean; chạy migration để cấp lại role rồi kiểm tra login/quyền/giao dịch. Volume Docker không thay backup; không chạy `docker compose down -v`.

Backup tạo tệp độc quyền với quyền 0600, từ chối ghi đè tệp/symlink đã có và ghi qua descriptor đã mở. Nếu thất bại, tệp rỗng/không hoàn chỉnh có thể còn lại nhưng không dùng được để restore; kiểm tra trước khi xóa/đổi tên rồi thử lại bằng tên mới. Lệnh backup/restore không cần ngân hàng nội dung hoặc cấu hình web đang hoạt động, để còn dùng được khi mount nội dung hỏng. Preflight vẫn kiểm tra nội dung và allowlist. Backup DB **không chứa** `COURSE_DATA_DIR`: phải sao lưu riêng bộ bài và nguồn soạn riêng tư, không đưa chúng lên Git công khai.

Rollback image tương thích schema, giữ DB/secrets/quyền mua. Nếu chưa an toàn: tắt bán và thông báo hỗ trợ, không mở lại endpoint nguyên mẫu trả cả đáp án. Chủ website chốt chính sách lưu/xóa email/giao dịch/audit trước production.

## Trạng thái xác minh

Chưa tạo VM, đổi DNS, liên kết MB, nhận tiền, thử SMTP HUST thật hoặc chứng minh 1.000 người trên VM. Docker/PostgreSQL native phải kiểm tra trong CI/staging nếu máy phát triển chưa có. Test cục bộ không phải chứng nhận bảo mật hoặc nghiệm thu production.
