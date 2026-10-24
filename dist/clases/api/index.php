<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require __DIR__ . '/lib.php';
try {
    $configPath = getenv('COMPAS_CONFIG') ?: dirname(rtrim($_SERVER['DOCUMENT_ROOT'], '/')) . '/compas-config.php';
    if (!is_file($configPath)) fail('Falta la configuración privada del servidor. Consulta INSTALACION.md.', 503);
    $config = require $configPath;
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1','::1'], true);
    if (!$secure && !(($config['allow_insecure_local'] ?? false) && $local)) fail('Accede a la aplicación mediante HTTPS.', 403);
    $pdo = new PDO($config['dsn'], $config['db_user'] ?? null, $config['db_password'] ?? null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
    if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') $pdo->exec('PRAGMA foreign_keys=ON');
    ini_set('session.use_strict_mode','1'); ini_set('session.gc_maxlifetime','28800');
    session_name('compas_session');
    session_set_cookie_params(['lifetime'=>0,'path'=>rtrim($config['base_path'] ?? '/clases','/').'/', 'secure'=>$secure,'httponly'=>true,'samesite'=>'Lax']);
    session_start();
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    $action = $_GET['action'] ?? 'bootstrap';
    $method = $_SERVER['REQUEST_METHOD'];
    if (!in_array($method,['GET','POST'],true)) fail('Método no permitido.',405);
    $body = [];
    if ($method === 'POST') {
        if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) fail('Sesión caducada. Recarga la página.',403);
        $body = requestData();
    }
    $u = currentUser();
    if ($action === 'bootstrap' && $method === 'GET') reply(['user'=>$u ? publicUser($u) : null, 'csrf'=>$_SESSION['csrf'], 'needsSetup'=>(int)query('SELECT COUNT(*) FROM compas_users')->fetchColumn() === 0]);
    if ($action === 'setup' && $method === 'POST') {
        rateLimit('setup',10);
        if (strlen($config['setup_key'] ?? '') < 24 || $config['setup_key'] === 'REPLACE_WITH_A_LONG_RANDOM_SECRET' || !hash_equals($config['setup_key'], textField($body,'setup_key'))) fail('Clave de instalación incorrecta.',403);
        $email=emailField($body); $name=textField($body,'name',120); $password=passwordField($body);
        if (!$name) fail('Indica tu nombre.');
        $pdo->beginTransaction(); query('UPDATE compas_meta SET lock_version=lock_version+1 WHERE id=1');
        if ((int)query('SELECT COUNT(*) FROM compas_users')->fetchColumn() !== 0) { $pdo->rollBack(); fail('La instalación ya está completada.',409); }
        $u=createUser($email,$name,$password,'admin'); $pdo->commit(); loginUser($u);
        reply(['user'=>publicUser($u),'csrf'=>$_SESSION['csrf']]);
    }
    if ($action === 'login' && $method === 'POST') {
        rateLimit('login'); $email=emailField($body); $password=$body['password'] ?? '';
        if (!is_string($password) || strlen($password)>1000) fail('Correo o contraseña incorrectos.',401);
        $found=query('SELECT * FROM compas_users WHERE email=?',[$email])->fetch();
        if (!$found || !password_verify($password,$found['password_hash'])) fail('Correo o contraseña incorrectos.',401);
        loginUser($found); reply(['user'=>publicUser($found),'csrf'=>$_SESSION['csrf']]);
    }
    if ($action === 'claim' && $method === 'POST') {
        rateLimit('claim'); $token=textField($body,'token',128); $name=textField($body,'name',120); $password=passwordField($body);
        if (!$name) fail('Indica tu nombre.');
        $hash=hash('sha256',$token);
        $pdo->beginTransaction();
        $updated=query('UPDATE compas_invites SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at>?',[time(),$hash,time()]);
        if ($updated->rowCount() !== 1) { $pdo->rollBack(); fail('El enlace ha caducado o ya se ha utilizado.',400); }
        $invite=query('SELECT * FROM compas_invites WHERE token_hash=?',[$hash])->fetch();
        $found=query('SELECT * FROM compas_users WHERE email=?',[$invite['email']])->fetch();
        if ($invite['kind']==='reset' && $found) {
            query('UPDATE compas_users SET password_hash=?,auth_version=auth_version+1 WHERE id=?',[password_hash($password,PASSWORD_DEFAULT),$found['id']]);
            $u=query('SELECT * FROM compas_users WHERE id=?',[$found['id']])->fetch();
        } elseif ($invite['kind']==='invite' && !$found) { $u=createUser($invite['email'],$name,$password,'teacher'); }
        else { $pdo->rollBack(); fail('Este enlace ya no es válido.',409); }
        $pdo->commit(); loginUser($u); reply(['user'=>publicUser($u),'csrf'=>$_SESSION['csrf']]);
    }
    if (!$u) fail('Inicia sesión para continuar.',401);
    if ($action==='logout' && $method==='POST') { $_SESSION=[]; session_destroy(); setcookie(session_name(),'', ['expires'=>time()-3600,'path'=>rtrim($config['base_path'] ?? '/clases','/').'/', 'secure'=>$secure,'httponly'=>true,'samesite'=>'Lax']); reply(['ok'=>true]); }
    if ($action==='workspace' && $method==='GET') {
        $row=query('SELECT payload,version FROM compas_workspaces WHERE user_id=?',[$u['id']])->fetch();
        reply(['data'=>json_decode($row['payload'],true,64,JSON_THROW_ON_ERROR),'version'=>(int)$row['version']]);
    }
    if ($action==='workspace' && $method==='POST') {
        if (!isset($body['version']) || !is_int($body['version']) || $body['version']<0) fail('Versión no válida.');
        $data=validateWorkspace($body['data'] ?? null);
        $json=json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
        $updated=query('UPDATE compas_workspaces SET payload=?,version=version+1,updated_at=? WHERE user_id=? AND version=?',[$json,time(),$u['id'],$body['version']]);
        if ($updated->rowCount()!==1) fail('Hay cambios guardados desde otra pestaña o dispositivo. Descarga tus cambios antes de recargar.',409);
        reply(['version'=>$body['version']+1]);
    }
    if ($action==='password' && $method==='POST') {
        if (!is_string($body['current_password'] ?? null) || strlen($body['current_password'])>1000 || !password_verify($body['current_password'],$u['password_hash'])) fail('La contraseña actual no es correcta.',403);
        query('UPDATE compas_users SET password_hash=?,auth_version=auth_version+1 WHERE id=?',[password_hash(passwordField($body),PASSWORD_DEFAULT),$u['id']]);
        $u=query('SELECT * FROM compas_users WHERE id=?',[$u['id']])->fetch(); loginUser($u); reply(['csrf'=>$_SESSION['csrf'],'ok'=>true]);
    }
    if ($action==='library' && $method==='GET') {
        $library=libraryData($u['role']==='admin');
        reply($library+['unseenIds'=>unseenLibraryIds($u['id'],$library['coreos'])]);
    }
    if ($action==='notifications' && $method==='GET') {
        $library=libraryData();
        $pending=$u['role']==='admin' ? (int)query("SELECT COUNT(*) FROM compas_suggestions WHERE status='pending' AND user_id<>?",[$u['id']])->fetchColumn() : 0;
        reply(['newCoreos'=>$u['role']==='admin' ? 0 : count(unseenLibraryIds($u['id'],$library['coreos'])),'pendingSuggestions'=>$pending]);
    }
    if (in_array($action,['library-seen','library-ignore'],true) && $method==='POST') {
        $ids=$body['ids'] ?? null;
        $versions=$body['versions'] ?? [];
        if (!is_array($ids) || !array_is_list($ids) || count($ids)>20000 || !is_array($versions)) fail('Lista no válida.');
        foreach ($ids as $id) {
            if (!is_string($id) || !preg_match('/^[a-zA-Z0-9_-]{1,100}$/D',$id)) fail('Identificador no válido.');
            if (!is_int($versions[$id] ?? 0) || ($versions[$id] ?? 0)<0) fail('Versión no válida.');
        }
        $available=[];
        foreach (libraryData()['coreos'] as $c) $available[$c['id']]=(int)($c['publicationVersion'] ?? 0);
        $pdo->beginTransaction();
        foreach (array_unique($ids) as $id) if (isset($available[$id])) {
            // A stale screen can acknowledge only the publication it actually displayed.
            $version=$versions[$id] ?? 0;
            if ($version>$available[$id]) { $pdo->rollBack(); fail('Versión de publicación no válida.'); }
            recordLibraryReceipt($u['id'],$id,$version,$action==='library-ignore' ? 'ignored' : 'seen');
        }
        $pdo->commit(); reply(['ok'=>true]);
    }
    if ($action==='coreo-states' && $method==='GET') {
        $workspace=json_decode(query('SELECT payload FROM compas_workspaces WHERE user_id=?',[$u['id']])->fetchColumn(),true,64,JSON_THROW_ON_ERROR);
        $library=array_fill_keys(array_column(libraryData()['coreos'],'id'),true);
        $suggestions=[];
        foreach (query('SELECT id,source_id,status FROM compas_suggestions WHERE user_id=?',[$u['id']])->fetchAll() as $s) $suggestions[$s['source_id']]=$s;
        $states=[]; $origins=[];
        $catalog=array_column(libraryData($u['role']==='admin')['coreos'],null,'id');
        foreach ($workspace['coreos'] as $c) {
            $suggestion=$suggestions[$c['id']] ?? null;
            if ($suggestion && $suggestion['status']==='pending') $state='pending';
            elseif ($suggestion && $suggestion['status']==='rejected') $state='rejected';
            elseif ($suggestion && $suggestion['status']==='accepted' && isset($library['suggestion_'.$suggestion['id']])) $state='accepted';
            elseif ($suggestion && $suggestion['status']==='accepted') $state='approved';
            elseif (isset($library[$c['id']])) $state='shared';
            elseif (!empty($c['libraryId']) && isset($library[$c['libraryId']])) $state='imported';
            else $state='private';
            $states[$c['id']]=$state;
            $entry=$catalog[$c['libraryId'] ?? $c['id']] ?? [];
            $origins[$c['id']]=array_intersect_key($entry,array_flip(['originTeacherName','published','publishedById','publishedByName']));
        }
        reply(['states'=>(object)$states,'origins'=>(object)$origins]);
    }
    if ($action==='suggestions' && $method==='GET') {
        $where=$u['role']==='admin' ? ' WHERE s.user_id<>?' : ' WHERE s.user_id=?';
        $rows=query('SELECT s.*,u.name AS teacher_name,u.email AS teacher_email,r.review_note,r.payload AS reviewed_payload FROM compas_suggestions s JOIN compas_users u ON u.id=s.user_id LEFT JOIN compas_suggestion_reviews r ON r.suggestion_id=s.id'.$where.' ORDER BY s.created_at DESC,s.id', [$u['id']])->fetchAll();
        foreach ($rows as &$row) { $row['coreo']=json_decode($row['payload'],true,64,JSON_THROW_ON_ERROR); $row['reviewedCoreo']=$row['reviewed_payload'] ? json_decode($row['reviewed_payload'],true,64,JSON_THROW_ON_ERROR) : null; unset($row['payload'],$row['reviewed_payload']); }
        unset($row); reply(['suggestions'=>$rows]);
    }
    if ($action==='suggestions' && $method==='POST') {
        if ($u['role']==='admin') fail('Puedes publicar directamente desde tu catálogo.',403);
        rateLimit('suggestions',60);
        $source=textField($body,'source_id',100);
        $pdo->beginTransaction();
        query('UPDATE compas_meta SET lock_version=lock_version+1 WHERE id=1');
        if (query('SELECT id FROM compas_suggestions WHERE user_id=? AND source_id=?',[$u['id'],$source])->fetchColumn()) { $pdo->rollBack(); fail('Ya has propuesto esta coreografía. Consulta su estado en Mis propuestas.',409); }
        $workspace=json_decode(query('SELECT payload FROM compas_workspaces WHERE user_id=?',[$u['id']])->fetchColumn(),true,64,JSON_THROW_ON_ERROR);
        $matches=array_values(array_filter($workspace['coreos'],fn($c)=>$c['id']===$source));
        if (!$matches) { $pdo->rollBack(); fail('La coreografía no está guardada en tu catálogo.',404); }
        $coreo=sharedCoreo($matches[0]);
        $id=bin2hex(random_bytes(16));
        query("INSERT INTO compas_suggestions (id,user_id,source_id,payload,status,created_at) VALUES (?,?,?,?,'pending',?)",[$id,$u['id'],$source,json_encode($coreo,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),time()]);
        $pdo->commit(); reply(['id'=>$id]);
    }
    if ($u['role']!=='admin') fail('No tienes permiso para esta operación.',403);
    if ($action==='review-suggestion' && $method==='POST') {
        $id=textField($body,'id',32); $decision=textField($body,'decision',10);
        if (!in_array($decision,['accepted','rejected'],true)) fail('Decisión no válida.');
        $note=textField($body,'review_note',2000);
        if ($decision==='rejected' && !$note) fail('Indica el motivo del descarte para el profesor.');
        $pdo->beginTransaction();
        $changed=query("UPDATE compas_suggestions SET status=?,reviewed_at=? WHERE id=? AND status='pending'",[$decision,time(),$id]);
        if ($changed->rowCount()!==1) { $pdo->rollBack(); fail('La propuesta ya ha sido revisada o no existe.',409); }
        $reviewed=[];
        if ($decision==='accepted') {
            $suggestion=query('SELECT payload FROM compas_suggestions WHERE id=?',[$id])->fetchColumn();
            $original=json_decode($suggestion,true,64,JSON_THROW_ON_ERROR);
            $coreo=$original;
            if (array_key_exists('coreo',$body)) {
                if (!is_array($body['coreo'])) fail('Ficha de revisión no válida.');
                $coreo=sharedCoreo($body['coreo']);
                $coreo['id']=$original['id'];
                validateWorkspace(['centers'=>[],'groups'=>[],'sessions'=>[],'coreos'=>[$coreo]]);
                if (!trim($coreo['name']) || !trim($coreo['level'])) fail('Indica el nombre y el nivel de la coreografía.');
            }
            $reviewed=sharedCoreo($coreo);
            $library=libraryData(true);
            foreach ($library['coreos'] as $existing) if (($existing['published'] ?? true)!==false && (preg_replace('/\s+/u',' ',trim($existing['name'])) === preg_replace('/\s+/u',' ',trim($coreo['name'])) || strcasecmp(trim($existing['name']),trim($coreo['name']))===0)) { $pdo->rollBack(); fail('Ya existe una coreografía con ese nombre en el catálogo común. Puedes descartar la propuesta.',409); }
            $coreo['id']='suggestion_'.$id;
            $coreo['publicationVersion']=$library['version']+1;
            $coreo['published']=false;
            $coreo['acceptedDraft']=true;
            $origin=query('SELECT u.id,u.name FROM compas_suggestions s JOIN compas_users u ON u.id=s.user_id WHERE s.id=?',[$id])->fetch();
            $coreo['originTeacherName']=$origin['name'];
            $coreo['originTeacherId']=$origin['id'];
            $library['coreos'][]=$coreo;
            validateWorkspace(['centers'=>[],'groups'=>[],'sessions'=>[],'coreos'=>$library['coreos']]);
            $saved=query('UPDATE compas_library SET payload=?,version=version+1,updated_at=? WHERE id=1 AND version=?',[json_encode($library['coreos'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),time(),$library['version']]);
            if ($saved->rowCount()!==1) { $pdo->rollBack(); fail('El catálogo ha cambiado. Vuelve a revisar la propuesta.',409); }
            // Admins do not receive library notices; approval must not depend on receipts.
        }
        query('INSERT INTO compas_suggestion_reviews (suggestion_id,reviewer_id,payload,review_note,created_at) VALUES (?,?,?,?,?)',[$id,$u['id'],json_encode($reviewed,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$note,time()]);
        $pdo->commit(); reply(['ok'=>true]);
    }
    if ($action==='library' && $method==='POST') {
        if (!isset($body['version']) || !is_int($body['version'])) fail('Versión no válida.');
        $data=validateWorkspace(['centers'=>[], 'groups'=>[], 'sessions'=>[], 'coreos'=>$body['coreos'] ?? null]);
        // Publication is additive: omitted routines must remain in the shared catalog.
        $pdo->beginTransaction();
        $library=libraryData(true);
        if ($library['version']!==$body['version']) fail('El catálogo común ha cambiado. Ciérralo y vuelve a abrirlo.',409);
        $merged=[];
        foreach ($library['coreos'] as $coreo) $merged[$coreo['id']]=$coreo;
        foreach ($data['coreos'] as $coreo) {
            $previous=$merged[$coreo['id']] ?? [];
            $origin=array_intersect_key($previous,array_flip(['originTeacherName','originTeacherId']));
            $merged[$coreo['id']]=sharedCoreo($coreo)+$origin+['publicationVersion'=>$library['version']+1,'published'=>true,'acceptedDraft'=>false,'publishedById'=>$u['id'],'publishedByName'=>$u['name']];
        }
        $coreos=array_values($merged);
        validateWorkspace(['centers'=>[], 'groups'=>[], 'sessions'=>[], 'coreos'=>$coreos]);
        $changed=query('UPDATE compas_library SET payload=?,version=version+1,updated_at=? WHERE id=1 AND version=?',[json_encode($coreos,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),time(),$body['version']]);
        if ($changed->rowCount()!==1) fail('El catálogo común ha cambiado. Ciérralo y vuelve a abrirlo.',409);
        // Only teachers need receipts; publishing is independent of notification preferences.
        $pdo->commit();
        reply(['version'=>$body['version']+1]);
    }

    if ($action==='library-unpublish' && $method==='POST') {
        $ids=$body['ids'] ?? null;
        if (!isset($body['version']) || !is_int($body['version']) || !is_array($ids) || !array_is_list($ids) || !$ids || count($ids)>20000) fail('Selección no válida.');
        foreach ($ids as $id) if (!is_string($id) || !preg_match('/^[a-zA-Z0-9_-]{1,100}$/D',$id)) fail('Identificador no válido.');
        $pdo->beginTransaction();
        $library=libraryData(true);
        if ($library['version']!==$body['version']) { $pdo->rollBack(); fail('El catálogo ha cambiado. Recarga la gestión antes de continuar.',409); }
        $selected=array_fill_keys($ids,true); $withdrawn=0;
        foreach ($library['coreos'] as &$coreo) if (isset($selected[$coreo['id']]) && ($coreo['published'] ?? true)!==false) { $coreo['published']=false; $withdrawn++; }
        unset($coreo);
        if (!$withdrawn) { $pdo->rollBack(); fail('No hay coreografías publicadas en la selección.',409); }
        $changed=query('UPDATE compas_library SET payload=?,version=version+1,updated_at=? WHERE id=1 AND version=?',[json_encode($library['coreos'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),time(),$library['version']]);
        if ($changed->rowCount()!==1) { $pdo->rollBack(); fail('El catálogo ha cambiado. Recarga la gestión antes de continuar.',409); }
        $pdo->commit();reply(['version'=>$library['version']+1,'withdrawn'=>$withdrawn]);
    }

    if ($action==='teacher-workspace' && $method==='GET') {
        $id=$_GET['user_id'] ?? '';
        if (!is_string($id) || !preg_match('/^[a-f0-9]{32}$/D',$id)) fail('Profesor no válido.');
        $teacher=query('SELECT id,email,name,role FROM compas_users WHERE id=?',[$id])->fetch();
        if (!$teacher) fail('Profesor no encontrado.',404);
        $row=query('SELECT payload,updated_at FROM compas_workspaces WHERE user_id=?',[$id])->fetch();
        reply(['user'=>$teacher,'data'=>json_decode($row['payload'],true,64,JSON_THROW_ON_ERROR),'updatedAt'=>(int)$row['updated_at']]);
    }

    if ($action==='users' && $method==='GET') reply(['users'=>query('SELECT id,email,name,role,created_at FROM compas_users ORDER BY created_at')->fetchAll()]);
    if ($action==='invite' && $method==='POST') {
        rateLimit('invite',30); $email=emailField($body); $kind=textField($body,'kind',10);
        $name=textField($body,'name',120);
        if ($kind==='invite' && !$name) fail('Indica el nombre del profesor.');
        if (!in_array($kind,['invite','reset'],true)) fail('Tipo de enlace no válido.');
        $found=query('SELECT id FROM compas_users WHERE email=?',[$email])->fetch();
        if (($kind==='invite' && $found) || ($kind==='reset' && !$found)) fail('El correo no corresponde a esta operación.');
        $from=$config['mail_from'] ?? '';
        $appUrl=rtrim($config['app_url'] ?? '', '/');
        if (!filter_var($from,FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/',$from) || !filter_var($appUrl,FILTER_VALIDATE_URL) || parse_url($appUrl,PHP_URL_SCHEME)!=='https' || strpbrk($appUrl,"\r\n?#")!==false) fail('Configura mail_from y app_url (HTTPS) en la configuración privada para enviar invitaciones.',503);
        $token=bin2hex(random_bytes(32));
        $pdo->beginTransaction();
        query('DELETE FROM compas_invites WHERE email=? OR expires_at<?',[$email,time()]);
        query('INSERT INTO compas_invites (token_hash,email,kind,expires_at) VALUES (?,?,?,?)',[hash('sha256',$token),$email,$kind,time()+172800]);
        $pdo->commit();
        $link=$appUrl.'/#acceso='.$token.'&nombre='.rawurlencode($name);
        $greeting=$kind==='invite' ? 'Hola '.$name.',' : 'Hola,';
        $message=$greeting."\n\n".($kind==='invite' ? 'Te han invitado a Compás. Abre este enlace para crear tu contraseña y entrar en tu espacio privado:' : 'Abre este enlace para crear una nueva contraseña de Compás:')."\n\n".$link."\n\nEl enlace caduca en 48 horas y solo puede usarse una vez.\n";
        try {
            $subject='Compas: acceso a tu cuenta';
            $headers=['From'=>$from,'Content-Type'=>'text/plain; charset=UTF-8'];
            if ($kind==='invite') {
                require_once __DIR__.'/email.php';
                $invitation=compasInvitationEmail($name,$link,$appUrl);
                $subject=$invitation['subject'];$message=$invitation['message'];
                $headers=['From'=>$from]+$invitation['headers'];
            }
            $sent=function_exists('mail') && mail($email,$subject,$message,$headers);
        }
        catch (Throwable $mailError) { error_log('Compas mail: '.$mailError->getMessage()); $sent=false; }
        reply(['token'=>$token,'link'=>$link,'expiresInHours'=>48,'emailSent'=>$sent,'message'=>$sent ? 'El servidor de correo ha aceptado la invitación. Comprueba también la carpeta de spam.' : 'El servidor no ha aceptado el correo. Copia el enlace y compártelo en privado.']);
    }
    fail('Ruta no encontrada.',404);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    $reference=bin2hex(random_bytes(4));
    error_log('Compas API ['.$reference.'] action='.(is_string($action ?? null) ? $action : 'unknown').' '.get_class($e).' '.$e->getMessage());
    // Expose only fixed installation guidance to administrators, never database details.
    if (($u['role'] ?? '')==='admin') {
        if ($e instanceof PDOException && in_array((string)$e->getCode(),['42S02','HY000'],true)) {
            foreach (['compas_library_receipts','compas_library_seen','compas_suggestions','compas_suggestion_reviews'] as $table) {
                if (str_contains($e->getMessage(),$table) && preg_match('/doesn.t exist|no such table|not exist/i',$e->getMessage())) {
                    $migration=$table==='compas_suggestion_reviews' ? 'migration-suggestion-reviews.sql' : ($table==='compas_library_receipts' ? 'migration-catalog-notices.sql' : 'migration-catalog.sql');
                    fail('Falta actualizar la base de datos. Importa '.$migration.' en phpMyAdmin. Referencia: '.$reference,503);
                }
            }
        }
        if ($e instanceof Error && str_contains($e->getMessage(),'Call to undefined function')) {
            fail('La API tiene archivos de versiones diferentes. Actualiza juntos api/index.php y api/lib.php. Referencia: '.$reference,503);
        }
    }
    fail('No se pudo completar la operación. Referencia: '.$reference.'. Consulta esa referencia en el registro de errores del servidor.',500);
}
