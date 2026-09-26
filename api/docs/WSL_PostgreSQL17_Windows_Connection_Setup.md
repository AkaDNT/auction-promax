Kết nối PostgreSQL 17 trên Windows từ WSL

Tài liệu này tiếp tục từ thời điểm PostgreSQL 17 trên Windows đã được xác nhận đang listen trên:

0.0.0.0:5432
[::]:5432

Mục tiêu là cho phép psql và script chạy trong WSL kết nối tới PostgreSQL Server đang chạy trên Windows.

1. Xác định IP của WSL

Trong WSL:

hostname -I

Hoặc lấy IP đầu tiên:

WSL_IP=$(hostname -I | awk '{print $1}')
echo "$WSL_IP"

Ví dụ:

172.26.80.77

IP của WSL có thể thay đổi sau khi restart WSL hoặc Windows. Không nên giả định IP luôn cố định.

2. Tạo Windows Firewall rule cho PostgreSQL

Mở PowerShell as Administrator trên Windows.

Cách khuyến nghị: chạy trên một dòng

Thay 172.26.80.77 bằng IP WSL hiện tại của bạn:

New-NetFirewallRule -DisplayName "PostgreSQL 17 - WSL" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5432 -RemoteAddress 172.26.80.77 -Profile Any

Hoặc viết nhiều dòng

Trong PowerShell, dấu backtick ` phải nằm ở cuối dòng:

New-NetFirewallRule `  -DisplayName "PostgreSQL 17 - WSL"`
-Direction Inbound `  -Action Allow`
-Protocol TCP `  -LocalPort 5432`
-RemoteAddress 172.26.80.77 `
-Profile Any

Không dùng \ để nối dòng trong PowerShell.

3. Nếu đã tạo nhầm Firewall rule

Nếu trước đó chỉ chạy:

New-NetFirewallRule -DisplayName "PostgreSQL 17 - WSL"

thì rule đã được tạo nhưng thiếu các điều kiện cần thiết.

Xóa rule đó:

Remove-NetFirewallRule -DisplayName "PostgreSQL 17 - WSL"

Kiểm tra rằng rule đã bị xóa:

Get-NetFirewallRule -DisplayName "PostgreSQL 17 - WSL" -ErrorAction SilentlyContinue

Không có output là bình thường.

Sau đó tạo lại rule đúng như ở bước 2.

4. Kiểm tra Firewall rule

Kiểm tra port:

Get-NetFirewallRule -DisplayName "PostgreSQL 17 - WSL" |
Get-NetFirewallPortFilter

Cần thấy:

Protocol : TCP
LocalPort : 5432

Kiểm tra IP được phép kết nối:

Get-NetFirewallRule -DisplayName "PostgreSQL 17 - WSL" |
Get-NetFirewallAddressFilter

Cần thấy IP WSL hiện tại, ví dụ:

RemoteAddress : 172.26.80.77

5. Lấy Windows host IP từ WSL

Trong WSL:

WINDOWS_HOST=$(ip route | awk '/default/ {print $3; exit}')
echo "$WINDOWS_HOST"

Ví dụ:

172.26.80.1

Trong mô hình WSL2 NAT thông thường:

WSL
172.26.80.77
|
| TCP
v
Windows Host
172.26.80.1:5432
|
v
PostgreSQL 17

6. Test TCP từ WSL tới PostgreSQL

Trong WSL:

timeout 3 bash -c "</dev/tcp/$WINDOWS_HOST/5432" \
 && echo "PostgreSQL port reachable" \
 || echo "PostgreSQL port blocked"

Nếu Firewall và PostgreSQL listener đều đúng:

PostgreSQL port reachable

7. Test bằng psql

Trong WSL:

PGCONNECT_TIMEOUT=3 psql \
 -h "$WINDOWS_HOST" \
 -p 5432 \
 -U postgres \
 -d postgres

Nếu network đã thông nhưng PostgreSQL chưa cho phép WSL authenticate, có thể gặp:

FATAL: no pg_hba.conf entry for host "172.26.80.77",
user "postgres",
database "postgres",
no encryption

Lỗi này có nghĩa là:

WSL -> Windows -> PostgreSQL
OK

PostgreSQL -> pg_hba.conf
DENIED

Tức là network đã hoạt động; bước tiếp theo là cấu hình PostgreSQL authentication.

Cấu hình pg_hba.conf

8. Xác định vị trí pg_hba.conf

Trong Windows PowerShell:

& "C:\Program Files\PostgreSQL\17\bin\psql.exe" `  -U postgres`
-d postgres `
-c "SHOW hba_file;"

Thông thường kết quả sẽ giống:

C:/Program Files/PostgreSQL/17/data/pg_hba.conf

9. Cho phép WSL kết nối

Mở pg_hba.conf bằng editor có quyền Administrator.

Thêm rule:

host all all 172.26.80.77/32 scram-sha-256

Thay:

172.26.80.77

bằng IP WSL hiện tại.

Ý nghĩa

host
│
│ all mọi database
│ │
│ │ all mọi PostgreSQL role
│ │ │
│ │ │ WSL IP duy nhất
│ │ │ │
v v v v
host all all 172.26.80.77/32 scram-sha-256
│
└─ password authentication

/32 nghĩa là chỉ đúng một IPv4 address được phép match rule này.

10. Không dùng cấu hình quá rộng

Không nên dùng:

host all all 0.0.0.0/0 trust

Lý do:

0.0.0.0/0 cho phép mọi IPv4 address match.

trust cho phép login mà không cần password.

Không phù hợp ngay cả với phần lớn môi trường development.

Với local development, giới hạn chính xác WSL IP và dùng:

scram-sha-256

là an toàn hơn.

11. Chú ý thứ tự rule trong pg_hba.conf

PostgreSQL kiểm tra rule theo thứ tự từ trên xuống.

Rule đầu tiên match connection sẽ được sử dụng.

Ví dụ:

# TYPE DATABASE USER ADDRESS METHOD

# IPv4 localhost

host all all 127.0.0.1/32 scram-sha-256

# WSL2 development environment

host all all 172.26.80.77/32 scram-sha-256

# IPv6 localhost

host all all ::1/128 scram-sha-256

Nếu file có một rule reject rộng hơn, hãy đảm bảo WSL rule phù hợp nằm trước rule reject đó.

Apply PostgreSQL configuration

12. Reload configuration

Có thể reload mà không cần restart toàn bộ PostgreSQL service.

Trong Windows PowerShell:

& "C:\Program Files\PostgreSQL\17\bin\psql.exe" `  -U postgres`
-d postgres `
-c "SELECT pg_reload_conf();"

Kết quả:

## pg_reload_conf

t

Hoặc restart PostgreSQL service:

Restart-Service postgresql-x64-17

Verify connection

13. Lấy lại Windows host IP

Trong WSL:

WINDOWS_HOST=$(ip route | awk '/default/ {print $3; exit}')
echo "$WINDOWS_HOST"

Ví dụ:

172.26.80.1

14. Kết nối PostgreSQL từ WSL

PGCONNECT_TIMEOUT=3 psql \
 -h "$WINDOWS_HOST" \
 -p 5432 \
 -U postgres \
 -d postgres

Nếu cấu hình đúng, psql sẽ hỏi:

Password for user postgres:

Nhập password của PostgreSQL role postgres.

Sau khi thành công:

psql (17.x)
Type "help" for help.

postgres=#

15. Verify PostgreSQL server

Trong psql:

SELECT version();

Kiểm tra user và database hiện tại:

SELECT current_user, current_database();

Thoát:

\q

Chạy lại ADR-016 bootstrap

16. Chạy script

Từ root project:

./api/scripts/local-db-bootstrap.sh

17. Lưu ý về localhost trong WSL

Nếu script vẫn báo:

connection to server at "localhost" (127.0.0.1), port 5432 failed:
Connection refused

thì nguyên nhân là script vẫn đang dùng:

localhost

Trong WSL:

localhost
|
v
127.0.0.1
|
v
WSL itself

Nó không nhất thiết trỏ tới PostgreSQL đang chạy trên Windows.

Trong setup này, đường kết nối đúng là:

WSL
172.26.80.77
|
v
Windows Host
172.26.80.1
|
v
PostgreSQL 17 :5432

Vì vậy script cần dùng Windows host IP thay cho localhost.

Có thể lấy host IP tự động bằng:

WINDOWS_HOST=$(ip route | awk '/default/ {print $3; exit}')

và dùng giá trị đó làm PostgreSQL host.

Ví dụ:

export PGHOST="$(ip route | awk '/default/ {print $3; exit}')"
export PGPORT=5432

Kiểm tra:

echo "$PGHOST"
echo "$PGPORT"

Sau đó các command psql có thể dùng:

psql \
 -h "$PGHOST" \
  -p "$PGPORT" \
 -U postgres \
 -d postgres

Luồng kết nối cuối cùng

local-db-bootstrap.sh
|
v
psql inside WSL
|
| PGHOST = Windows host IP
v
Windows Firewall
TCP 5432
WSL IP allowed
|
v
PostgreSQL 17
listen_addresses = \*
|
v
pg_hba.conf
WSL_IP/32 + scram-sha-256
|
v
Password authentication
|
v
PostgreSQL connection successful
