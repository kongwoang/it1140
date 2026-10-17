// Shared by the editor, the isolated worker and regression tests. No HTML/eval.
(function (root) {
  const advice = {
    IndentationError: ['Thụt lề chưa đúng', 'Các lệnh trong cùng một khối phải thẳng hàng. Sau if, for, while hoặc def, nhấn Enter rồi Tab để thêm 4 dấu cách.'],
    TabError: ['Đang trộn Tab và dấu cách', 'Đổi phần thụt đầu dòng về dấu cách và giữ các dòng cùng khối thẳng hàng. Nút thụt lề và phím Tab trong trình soạn thảo thêm 4 dấu cách.'],
    NameError: ['Tên biến hoặc hàm chưa được định nghĩa', 'Kiểm tra cách viết, chữ hoa/chữ thường và dòng gán giá trị. Biến phải có giá trị trước khi được sử dụng.'],
    UnboundLocalError: ['Biến cục bộ chưa có giá trị', 'Có nhánh trong hàm chưa gán biến trước khi dùng. Kiểm tra tất cả nhánh if/else và giá trị trả về của hàm.'],
    TypeError: ['Đang dùng sai kiểu dữ liệu', 'input() trả về chuỗi. Kiểm tra chỗ cần int() hoặc float(), kiểu của đối số và phép toán đang dùng.'],
    ValueError: ['Giá trị đầu vào không phù hợp', 'Kiểm tra định dạng dữ liệu, phép đổi int()/float() hoặc số lượng giá trị khi tách một dòng bằng split().'],
    IndexError: ['Chỉ số nằm ngoài dãy', 'Với dãy có n phần tử, chỉ số không âm hợp lệ là 0 đến n−1. Kiểm tra cận range() và trường hợp dãy rỗng.'],
    KeyError: ['Không có khóa này trong dictionary', 'Kiểm tra tên khóa hoặc dùng key in dictionary / get() nếu đề cho phép khóa chưa tồn tại.'],
    ZeroDivisionError: ['Đang chia cho 0', 'Kiểm tra mẫu số trước các phép /, // hoặc %. Đề có trường hợp dữ liệu bằng 0 không?'],
    EOFError: ['Chương trình đã đọc hết dữ liệu vào', 'Số lần input() đang nhiều hơn số dòng được cung cấp. Xem mục stdin hoặc từng ca kiểm tra và cách đề yêu cầu nhập dữ liệu.'],
    FileNotFoundError: ['Không tìm thấy tệp', 'Đối chiếu đúng tên tệp trong đề và mục Tệp dữ liệu mẫu. Tệp chạy trong môi trường trình duyệt, không phải tệp có sẵn trên máy của bạn.'],
    ModuleNotFoundError: ['Không tìm thấy thư viện', 'Kiểm tra tên ở lệnh import. Một số thư viện hoặc giao diện như Turtle/Tk không chạy trong trình duyệt; xem yêu cầu của bài.'],
    ImportError: ['Không nhập được thành phần thư viện', 'Kiểm tra tên thư viện, tên hàm sau from ... import ... và khả năng hỗ trợ trong môi trường trình duyệt.'],
    AttributeError: ['Đối tượng không có thuộc tính này', 'Kiểm tra kiểu dữ liệu và tên phương thức. Chú ý list.sort() sửa list tại chỗ và trả về None, không phải list mới.'],
    RecursionError: ['Gọi hàm đệ quy quá sâu', 'Kiểm tra điều kiện dừng và bảo đảm mỗi lần gọi tiến gần đến điều kiện đó. Có thể dùng vòng lặp cho dữ liệu lớn.'],
    OverflowError: ['Kết quả vượt giới hạn phép tính', 'Kiểm tra số mũ, giá trị đưa vào hàm toán học và miền dữ liệu mà đề cho phép.'],
    MemoryError: ['Không đủ bộ nhớ', 'Tránh tạo list quá lớn hoặc lặp thêm phần tử không có điểm dừng. Thử xử lý từng phần dữ liệu.'],
    OutputLimitExceeded: ['Chương trình in quá nhiều', 'Đã dừng thu đầu ra để giữ trình duyệt ổn định. Kiểm tra vòng lặp vô hạn hoặc bỏ các lệnh print() dùng để dò lỗi.'],
    SystemExit: ['Chương trình yêu cầu kết thúc', 'Kiểm tra sys.exit(). Nếu cần dừng bình thường, dùng mã kết thúc 0 hoặc tổ chức lại nhánh xử lý.'],
    AssertionError: ['Một điều kiện kiểm tra chưa đạt', 'Đọc yêu cầu và so sánh kết quả ở ca đang sai; chương trình chạy xong chưa có nghĩa là đã giải đúng bài.'],
    KeyboardInterrupt: ['Chương trình đã bị ngắt', 'Kiểm tra vòng lặp và thử chạy lại với dữ liệu nhỏ hơn.'],
  };
  function explain(diagnostic) {
    const d = diagnostic || {}, type = typeof d.type === 'string' ? d.type : 'PythonError';
    let message = advice[type] || ['Chương trình gặp lỗi', 'Xem dòng được chỉ ra và dòng ngay trước nó; đọc thông báo Python đầy đủ nếu cần.'];
    if (type === 'SyntaxError') {
      const raw = String(d.message || '');
      message = /never closed|unmatched|does not match/.test(raw)
        ? ['Dấu ngoặc chưa khớp', 'Kiểm tra các cặp (), [] và {}. Dấu mở ở dòng trước cũng có thể làm Python báo lỗi ở dòng sau.']
        : /unterminated|EOL while scanning/.test(raw)
          ? ['Chuỗi chưa đóng dấu nháy', 'Đóng chuỗi bằng cùng loại dấu nháy đã mở. Chuỗi nhiều dòng cần cặp ba dấu nháy.']
          : /expected ':'/.test(raw)
            ? ['Có thể đang thiếu dấu hai chấm', 'Thêm dấu : sau điều kiện if/elif/else, vòng lặp for/while, def hoặc câu lệnh mở khối tương ứng.']
            : ['Cú pháp Python chưa hợp lệ', 'Kiểm tra dấu ngoặc, dấu nháy, dấu hai chấm và cách viết câu lệnh ở dòng này hoặc dòng ngay trước nó.'];
    }
    const raw = String(d.message || '');
    if(type === 'IndentationError' && /unexpected indent/.test(raw)) message=['Dòng này đang thụt vào quá mức','Kiểm tra xem dòng có thực sự nằm trong if/for/while/def hay không. Dùng Shift+Tab hoặc nút ← Lề để lùi một mức khi cần.'];
    if(type === 'IndentationError' && /unindent does not match/.test(raw)) message=['Mức lùi lề không khớp khối trước','Đặt đầu dòng thẳng với một mức lề đã có. Kiểm tra cả Tab thật và dấu cách ở những dòng phía trên.'];
    if(type === 'ValueError' && /invalid literal for int|could not convert string to float/.test(raw)) message=['Dữ liệu chưa đổi được thành số','Kiểm tra dòng stdin đang đọc: int() cần chuỗi số nguyên, float() dùng dấu chấm thập phân. Nếu một dòng có nhiều số, cần split() rồi đổi từng số.'];
    if(type === 'ValueError' && /too many values to unpack|not enough values to unpack/.test(raw)) message=['Số giá trị đọc được không khớp số biến','Đối chiếu số biến ở bên trái với số phần tử ở bên phải. Nếu dùng input().split(), xem ca này có bao nhiêu giá trị trên một dòng.'];
    if(type === 'TypeError' && /not iterable/.test(raw)) message=['Đang duyệt một giá trị không phải dãy','for, list(), sum() hoặc phép tách nhiều biến cần một đối tượng duyệt được, không phải một số đơn lẻ. Muốn lặp n lần thì dùng range(n).'];
    if(type === 'TypeError' && /required positional argument/.test(raw)) message=['Lời gọi hàm đang thiếu đối số','Đối chiếu các tham số trong def với các giá trị truyền vào lúc gọi hàm. Thêm đối số còn thiếu hoặc xem lại tham số mặc định.'];
    return { type, title: message[0], help: message[1], line: Number.isInteger(d.line) && d.line > 0 ? d.line : null,
      column: Number.isInteger(d.column) && d.column > 0 ? d.column : null, source: String(d.source || ''), detail: String(d.message || ''), traceback: String(d.traceback || '') };
  }
  function outputDifference(actual, expected, exact = false) {
    const norm = value => {const text = String(value ?? '').replace(/\r\n?/g, '\n');return exact ? text : text.replace(/[ \t]+$/gm, '').trimEnd();};
    const a = norm(actual), e = norm(expected);
    if (a === e) return null;
    const al = a.split('\n'), el = e.split('\n');let index = 0;
    while (index < Math.min(al.length, el.length) && al[index] === el[index]) index++;
    return { line: index + 1, actual: al[index] ?? '(không có dòng này)', expected: el[index] ?? '(không có dòng này)',
      help: exact ? 'Nội dung tệp cần giữ đúng dấu cách và ký tự xuống dòng như đề yêu cầu.' : e === '' ? 'Bài này không yêu cầu in văn bản. Bỏ các print() không cần thiết.' : 'Kiểm tra công thức, thứ tự kết quả, số chữ số thập phân và yêu cầu có được in lời nhắc hay không.' };
  }
  function compareCase(result, test, mode = "tests") {
    const norm = value => String(value ?? '').replace(/\r\n?/g, '\n');
    const expectedFiles = test.expectedFiles || {}, files = result.fileResults || {};
    const wrongFile = Object.entries(expectedFiles).find(([name, expected]) => typeof files[name] !== 'string' || norm(files[name]) !== norm(expected));
    const difference = mode === 'single' || result.error || result.checkError ? null : outputDifference(result.output, test.output || '');
    const fileDifference = mode !== 'single' && wrongFile && !result.error ? {
      name:wrongFile[0],missing:!Object.prototype.hasOwnProperty.call(files,wrongFile[0]),
      unreadable:Object.prototype.hasOwnProperty.call(files,wrongFile[0]) && typeof files[wrongFile[0]] !== 'string',
      ...outputDifference(files[wrongFile[0]],wrongFile[1],true),
    } : null;
    const briefError = result.diagnostic ? explain(result.diagnostic).title : result.error;
    return {label:test.label, passed:!result.error && !result.checkError && (mode === 'single' || (!difference && !wrongFile)),
      error:briefError || result.checkError || (difference ? 'Đầu ra chưa khớp.' : '') || (fileDifference ? `Tệp ${wrongFile[0]} chưa đúng.` : ''),
      difference,fileDifference,input:test.input || ''};
  }
  const pythonHelpers = String.raw`
import io as _it_io
import traceback as _it_traceback
import linecache as _it_linecache

class OutputLimitExceeded(Exception):
    pass

class _IT1140Output(_it_io.StringIO):
    def write(self, text):
        if self.tell() + len(text) > 200000:
            raise OutputLimitExceeded("Đầu ra vượt 200000 ký tự")
        return super().write(text)

def _it1140_diagnostic(exc, code):
    lines = code.splitlines()
    _it_linecache.cache["main.py"] = (len(code), None, [line + "\n" for line in lines], "main.py")
    line = getattr(exc, "lineno", None) if isinstance(exc, SyntaxError) else None
    column = getattr(exc, "offset", None) if isinstance(exc, SyntaxError) else None
    frames = [f for f in _it_traceback.extract_tb(exc.__traceback__) if f.filename == "main.py"]
    if frames and not isinstance(exc, SyntaxError):
        line = frames[-1].lineno
        byte_offset = frames[-1].colno
        # Runtime frame columns count UTF-8 bytes; SyntaxError.offset counts
        # characters. Convert before sending a human-readable column to the UI.
        column = len(lines[line - 1].encode("utf-8")[:byte_offset].decode("utf-8", "ignore")) + 1 if byte_offset is not None and 0 < line <= len(lines) else None
    return {"type": type(exc).__name__, "message": str(getattr(exc, "msg", exc))[:8000],
            "line": line, "column": column, "source": lines[line - 1][:2000] if isinstance(line, int) and 0 < line <= len(lines) else "",
            "traceback": "".join(_it_traceback.format_exception(type(exc), exc, exc.__traceback__))[-16000:]}
`;
  const caseFileNames = tests => [...new Set(tests.flatMap(test => [...Object.keys(test.files || {}), ...Object.keys(test.expectedFiles || {})]))];
  root.IT1140PythonErrors = { explain, outputDifference, compareCase, caseFileNames, pythonHelpers };
})(globalThis);
