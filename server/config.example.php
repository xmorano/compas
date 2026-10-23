<?php
// Copy OUTSIDE public_html as compas-config.php; never upload credentials into /clases.
return [
    'dsn' => 'mysql:host=localhost;dbname=CPANEL_clases;charset=utf8mb4',
    'db_user' => 'CPANEL_clases',
    'db_password' => 'CHANGE_ME',
    'app_url' => 'https://TU-DOMINIO/clases',
    'mail_from' => 'compas@TU-DOMINIO', // Cuenta de correo del dominio autorizada en el hosting.
    'base_path' => '/clases',
    'setup_key' => 'REPLACE_WITH_A_LONG_RANDOM_SECRET',
    'allow_insecure_local' => false,
];
