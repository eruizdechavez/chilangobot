module.exports = function(controller) {
  controller.on('interactive_message_callback', function(bot, message) {
    console.log(message);
    var dialog = bot
      .createDialog('Nueva Oferta de Trabajo', 'publica_nueva_oferta', 'Publicar')
      .addText('Titulo', 'title', null, { placeholder: 'Un titulo relevante para la oferta de trabajo' })
      .addText('Lugar de trabajo', 'place', null, { placeholder: 'En oficina? Remoto? En que cidad, estado, pais?' })
      .addText('Rango de salario', 'salary', null, { placeholder: 'Para darle una mejor idea a los candidatos' })
      .addTextarea('Descripcion', 'content', null, {
        placeholder: 'Descripcion completa del trabajo, hasta 3000 caracteres',
      });

    bot.replyWithDialog(message, dialog.asObject());
  });
};
