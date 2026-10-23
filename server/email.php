<?php
declare(strict_types=1);

// Build the message without sending it, so rendering and delivery remain separate.
function compasInvitationEmail(string $name, string $link, string $appUrl): array {
    $template=file_get_contents(__DIR__.'/email-invitation.html');
    if ($template===false) throw new RuntimeException('Falta la plantilla de invitación.');
    $escape=fn(string $value): string=>htmlspecialchars($value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
    $html=strtr($template,[
        '{{NAME}}'=>$escape($name),
        '{{LINK}}'=>$escape($link),
        '{{LOGO}}'=>$escape($appUrl.'/assets/vadecountry-logo.png'),
    ]);
    $text="Hola, ".$name.":\n\nTe invitamos a Compás, una herramienta de VaDeCountry pensada para ayudarte a preparar tus clases de baile y llevar un seguimiento de lo que enseñas.\n\nTendrás tu propio espacio privado, donde podrás:\n\n".
        "- Organizar tus centros y grupos, con sus horarios y niveles.\n".
        "- Crear tu lista de coreografías, con música, vídeos, hojas de pasos y notas.\n".
        "- Preparar cada clase, eligiendo qué vas a enseñar, repasar o bailar.\n".
        "- Registrar lo que habéis hecho, para consultar el historial y preparar la siguiente sesión.\n".
        "- Compartir con tus alumnos el resumen de la clase y las coreografías que habéis trabajado.\n".
        "- Descubrir coreos del catálogo común, copiarlas a tu lista y proponer las tuyas para compartirlas con otros profesores.\n\n".
        "Tus centros, grupos, clases y coreografías estarán separados de los de otros profesores. El administrador podrá consultarlos para gestionar la plataforma.\n\n".
        "Empieza creando tu contraseña:\nActivar mi cuenta de Compás: ".$link."\n\n".
        "Este enlace es personal, solo puede utilizarse una vez y caduca en 48 horas. Si caduca, solicita una nueva invitación al administrador.\n\n".
        "¡Nos vemos en la pista!\n\nCompás\nTu estudio, a tu ritmo.\nPowered by VaDeCountry\n";
    $boundary='compas_'.bin2hex(random_bytes(16));
    $encode=fn(string $part): string=>quoted_printable_encode(str_replace(["\r\n","\r","\n"],["\n","\n","\r\n"],$part));
    $message='--'.$boundary."\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n".$encode($text)."\r\n".
        '--'.$boundary."\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n".$encode($html)."\r\n--".$boundary."--\r\n";
    $subject='=?UTF-8?B?'.base64_encode('Te invitamos a Compás · Tu espacio para organizar tus clases').'?=';
    return ['subject'=>$subject,'message'=>$message,'headers'=>['MIME-Version'=>'1.0','Content-Type'=>'multipart/alternative; boundary="'.$boundary.'"']];
}
