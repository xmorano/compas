<?php
$root=__DIR__.'/runtime';
@mkdir($root,0700,true);
$path=$root.'/test.sqlite';
if(file_exists($path))unlink($path);
$p=new PDO('sqlite:'.$path);
$p->exec('PRAGMA foreign_keys=ON');
$p->exec('CREATE TABLE compas_meta (id INTEGER PRIMARY KEY,lock_version INTEGER NOT NULL DEFAULT 0); INSERT INTO compas_meta VALUES(1,0);
CREATE TABLE compas_users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL,auth_version INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE compas_workspaces(user_id TEXT PRIMARY KEY REFERENCES compas_users(id) ON DELETE CASCADE,payload TEXT NOT NULL,version INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE compas_invites(token_hash TEXT PRIMARY KEY,email TEXT NOT NULL,kind TEXT NOT NULL,expires_at INTEGER NOT NULL,used_at INTEGER);
CREATE TABLE compas_limits(bucket TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE compas_library(id INTEGER PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL,updated_at INTEGER NOT NULL); INSERT INTO compas_library VALUES(1,\'[]\',0,0);');
$config=['dsn'=>'sqlite:'.$path,'base_path'=>'/clases','setup_key'=>'test-only-installation-key-123456789','allow_insecure_local'=>true];
file_put_contents($root.'/config.php',"<?php\nreturn ".var_export($config,true).";\n");
chmod($root.'/config.php',0600);
echo "Test database ready\n";
