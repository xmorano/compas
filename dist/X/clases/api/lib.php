<?php
declare(strict_types=1);
function reply(array $body, int $status = 200): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}
function fail(string $message, int $status = 400): never { reply(['error' => $message], $status); }
function query(string $sql, array $params = []): PDOStatement {
    global $pdo;
    $stmt = $pdo->prepare($sql); $stmt->execute($params); return $stmt;
}
function requestData(): array {
    $raw = file_get_contents('php://input', false, null, 0, 5 * 1024 * 1024 + 1);
    if ($raw === false || strlen($raw) > 5 * 1024 * 1024) fail('La petición supera el límite de 5 MB.', 413);
    try { $body = json_decode($raw, true, 64, JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { fail('JSON no válido.'); }
    if (!is_array($body)) fail('Petición no válida.');
    return $body;
}
function textField(array $body, string $key, int $max = 254): string {
    $value = $body[$key] ?? '';
    if (!is_string($value) || strlen($value) > $max) fail('Campo no válido: ' . $key);
    return trim($value);
}
function emailField(array $body): string {
    $email = strtolower(textField($body, 'email'));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Indica un correo válido.');
    return $email;
}
function passwordField(array $body): string {
    $password = $body['password'] ?? '';
    if (!is_string($password) || strlen($password) < 12 || strlen($password) > 72) fail('La contraseña debe tener entre 12 y 72 bytes.');
    return $password;
}
function emptyWorkspace(): array { return ['centers'=>[], 'groups'=>[], 'coreos'=>[], 'sessions'=>[]]; }
function validateWorkspace(mixed $data): array {
    if (!is_array($data)) fail('Copia de datos no válida.');
    $out = [];
    foreach (['centers','groups','coreos','sessions'] as $key) {
        if (!isset($data[$key]) || !is_array($data[$key]) || !array_is_list($data[$key]) || count($data[$key]) > 20000) fail('Lista no válida: ' . $key);
        $out[$key] = $data[$key];
    }
    $ids = [];
    $required = ['centers'=>['name','address'], 'groups'=>['center','level','day','start','end'], 'coreos'=>['name','level'], 'sessions'=>['group','date','start','end','term']];
    foreach ($out as $key => $rows) {
        $ids[$key] = [];
        foreach ($rows as $row) {
            if (!is_array($row) || !is_string($row['id'] ?? null) || !preg_match('/^[a-zA-Z0-9_-]{1,100}$/D', $row['id']) || isset($ids[$key][$row['id']])) fail('Identificador duplicado o no válido en ' . $key);
            $ids[$key][$row['id']] = true;
            foreach ($required[$key] as $field) if (!isset($row[$field]) || !is_string($row[$field]) || strlen($row[$field]) > 2000) fail('Campo no válido: ' . $field);
            foreach ($row as $field => $value) {
                if ($field === 'items' && $key === 'sessions') continue;
                if (!is_scalar($value) && $value !== null) fail('Valor no válido en ' . $key);
                if (is_string($value) && strlen($value) > 10000) fail('Texto demasiado largo.');
            }
            foreach (['photo','music','video','sheet','whatsapp'] as $url) if (!empty($row[$url]) && (!is_string($row[$url]) || !filter_var($row[$url], FILTER_VALIDATE_URL) || !in_array(strtolower(parse_url($row[$url], PHP_URL_SCHEME) ?? ''), ['http','https'], true))) fail('Enlace no válido: ' . $url);
        }
    }
    foreach ($out['groups'] as $g) if (!isset($ids['centers'][$g['center']])) fail('Un grupo hace referencia a un centro inexistente.');
    foreach ($out['sessions'] as $s) {
        if (!isset($ids['groups'][$s['group']]) || !is_bool($s['closed'] ?? null) || !is_array($s['items'] ?? null) || !array_is_list($s['items'])) fail('Clase no válida.');
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $s['date']);
        if (!$date || $date->format('Y-m-d') !== $s['date']) fail('Fecha no válida.');
        foreach (['start','end'] as $hour) if (!preg_match('/^([01][0-9]|2[0-3]):[0-5][0-9]$/D', $s[$hour])) fail('Hora no válida.');
        $seen = [];
        foreach ($s['items'] as $i) {
            if (!is_array($i) || !is_string($i['coreo'] ?? null) || !isset($ids['coreos'][$i['coreo']]) || isset($seen[$i['coreo']]) || !is_bool($i['done'] ?? null) || !in_array($i['mode'] ?? null, ['Nueva','Repaso','Bailar'], true) || !is_string($i['note'] ?? null) || strlen($i['note']) > 10000) fail('Registro de coreografía no válido.');
            $seen[$i['coreo']] = true;
        }
    }
    return $out;
}
function rateLimit(string $scope, int $max = 30): void {
    global $pdo;
    $now = time();
    $bucket = hash('sha256', $scope . '|' . ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . (string) intdiv($now, 900));
    if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
        query('INSERT INTO compas_limits (bucket,attempts,expires_at) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=attempts+1', [$bucket,$now+1800]);
    } else {
        query('INSERT INTO compas_limits (bucket,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1', [$bucket,$now+1800]);
    }
    if ((int)query('SELECT attempts FROM compas_limits WHERE bucket=?',[$bucket])->fetchColumn() > $max) fail('Demasiados intentos. Espera 15 minutos.', 429);
    query('DELETE FROM compas_limits WHERE expires_at < ?',[$now]);
}
function publicUser(array $u): array { return array_intersect_key($u, array_flip(['id','name','email','role'])); }
function loginUser(array $u): void {
    session_regenerate_id(true);
    $_SESSION = ['user_id'=>$u['id'], 'auth_version'=>(int)$u['auth_version'], 'last_seen'=>time(), 'csrf'=>bin2hex(random_bytes(32))];
}
function currentUser(): ?array {
    if (!isset($_SESSION['user_id'])) return null;
    $u = query('SELECT * FROM compas_users WHERE id=?',[$_SESSION['user_id']])->fetch();
    if (!$u || (int)$u['auth_version'] !== ($_SESSION['auth_version'] ?? 0) || time() - ($_SESSION['last_seen'] ?? 0) > 28800) {
        unset($_SESSION['user_id'], $_SESSION['auth_version']); return null;
    }
    $_SESSION['last_seen'] = time(); return $u;
}
function createUser(string $email, string $name, string $password, string $role): array {
    $id = bin2hex(random_bytes(16));
    query('INSERT INTO compas_users (id,email,name,password_hash,role,auth_version,created_at) VALUES (?,?,?,?,?,1,?)',[$id,$email,$name,password_hash($password, PASSWORD_DEFAULT),$role,time()]);
    query('INSERT INTO compas_workspaces (user_id,payload,version,updated_at) VALUES (?,?,0,?)',[$id,json_encode(emptyWorkspace()),time()]);
    return query('SELECT * FROM compas_users WHERE id=?',[$id])->fetch();
}
