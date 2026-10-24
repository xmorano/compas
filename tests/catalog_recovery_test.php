<?php
// Run: php tests/catalog_recovery_test.php (requires PDO SQLite).
require __DIR__.'/../server/lib.php';
$pdo=new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE,PDO::FETCH_ASSOC);
$pdo->exec('CREATE TABLE compas_library(id INTEGER PRIMARY KEY,payload TEXT,version INTEGER);
CREATE TABLE compas_users(id TEXT PRIMARY KEY,name TEXT);
CREATE TABLE compas_suggestions(id TEXT PRIMARY KEY,user_id TEXT,payload TEXT,status TEXT,created_at INTEGER);
CREATE TABLE compas_suggestion_reviews(suggestion_id TEXT PRIMARY KEY,payload TEXT);');
query('INSERT INTO compas_library VALUES(1,?,7)',['[]']);
query('INSERT INTO compas_users VALUES(?,?)',['teacher','Ana']);
foreach (['accepted','pending','rejected'] as $status) {
    query('INSERT INTO compas_suggestions VALUES(?,?,?,?,1)',[$status,'teacher',json_encode(['id'=>'private-'.$status,'name'=>'Original','level'=>'Inicial']),$status]);
}
query('INSERT INTO compas_suggestion_reviews VALUES(?,?)',['accepted',json_encode(['id'=>'private-accepted','name'=>'Ficha corregida','level'=>'Intermedio','extras'=>'Comentario revisado'])]);
function check(bool $condition,string $message): void {if (!$condition) throw new RuntimeException($message);}
$admin=libraryData(true);
check(count($admin['coreos'])===1,'Recuperar solo aceptadas');
$draft=$admin['coreos'][0];
check($draft['id']==='suggestion_accepted' && $draft['name']==='Ficha corregida','Conservar revisión e identidad');
check($draft['published']===false && $draft['acceptedDraft']===true,'Recuperar sin publicar');
check($draft['originTeacherName']==='Ana','Conservar procedencia');
check(libraryData()['coreos']===[],'Ningún profesor recibe el borrador');
check($admin['version']===7,'La consulta no altera la versión');
query('UPDATE compas_library SET payload=?',[json_encode([$draft+['testMarker'=>'conservar']])]);
check(count(libraryData(true)['coreos'])===1,'No duplicar');
check(libraryData(true)['coreos'][0]['testMarker']==='conservar','No sobrescribir fichas existentes');
$draft['acceptedDraft']=false;
query('UPDATE compas_library SET payload=?',[json_encode([$draft])]);
check(libraryData(true)['coreos'][0]['acceptedDraft']===false,'No cambiar una ficha retirada');
$draft['published']=true;
query('UPDATE compas_library SET payload=?',[json_encode([$draft])]);
check(libraryData(false,'teacher')['coreos']===[],'No devolver al profesor de origen');
check(count(libraryData(false,'another')['coreos'])===1,'Publicación disponible para otros');
echo "OK: recuperación de aceptadas, correcciones, procedencia, estados y aislamiento.\n";
