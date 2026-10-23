<?php
declare(strict_types=1);
require dirname(__DIR__).'/server/email.php';
function check(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
$link='https://example.test/clases/#acceso=test-token&nombre=Ana';
$email=compasInvitationEmail('Ana <script>alert(1)</script>',$link,'https://example.test/clases');
check(isset($email['headers']['MIME-Version']), 'Falta MIME-Version');
check((bool)preg_match('/boundary="([^"]+)"/',$email['headers']['Content-Type'],$match), 'Falta boundary');
$parts=explode('--'.$match[1],$email['message']);
check(count($parts)===4, 'Debe contener texto, HTML y cierre');
$text=quoted_printable_decode(explode("\r\n\r\n",$parts[1],2)[1]);
$html=quoted_printable_decode(explode("\r\n\r\n",$parts[2],2)[1]);
check(str_contains($text,$link), 'Enlace incorrecto en texto');
check(str_contains($html,htmlspecialchars($link,ENT_QUOTES,'UTF-8')), 'Enlace incorrecto en HTML');
check(!str_contains($html,'<script>'), 'Nombre sin escapar');
check(str_contains($html,'Ana &lt;script&gt;'), 'Nombre incorrecto');
check(!preg_match('/\{\{[A-Z]+\}\}/',$html), 'Quedan variables sin sustituir');
foreach (['centros','coreografías','enseñar','repasar','alumnos','catálogo común','administrador','48 horas','VaDeCountry'] as $word) {
    check(str_contains($text,$word), 'Falta contenido en texto: '.$word);
    check(str_contains($html,$word), 'Falta contenido en HTML: '.$word);
}
check($email['headers']['Content-Type']!==compasInvitationEmail('Otra persona',$link,'https://example.test/clases')['headers']['Content-Type'], 'Boundary reutilizado');
echo "OK: invitación multipart, contenido, enlaces, escape HTML y límites MIME. Sin enviar correo.\n";
