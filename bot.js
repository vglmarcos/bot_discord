const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const prefix = config.prefix;
const GOOGLE_API_KEY = config.GOOGLE_API_KEY;
const Ytdl = require('ytdl-core');
const Youtube = require('simple-youtube-api');
const t = 4000;
const color = '#e4b400';
const queue = new Map();
const youtube = new Youtube(GOOGLE_API_KEY);
var autoplay = false;
var cancionAnterior;
var participantes = [];
var sorteo = false;
var mesaj;
var mensajesor;
var autor;

client.on('warn', console.warn);

client.on('error', console.error);

client.on('disconnect', () => console.log('Desconectado, reconectando ahora...'));

client.on('reconnecting', () => {
  console.log('Reconectando!');
  //client.user.setActivity(`Reconectando`);
  //client.user.setStatus('idle');
});

client.on("ready", async () => {
  console.log(`Bot listo como ${client.user.tag}.`);
  client.user.setActivity(`${prefix}help`, { type: 'Playing' });
  client.user.setStatus('online');
});

client.on("messageReactionAdd", async (messageR, user) => {
  if (sorteo) {
    if (messageR.message.content === mensajesor && messageR.message.author === autor) {
      let rep = participantes.find(x => {
        if (x === user) {
          return true;
        }
      });
      if (!rep) {
        participantes.push(user);
        //console.log(participantes);
      }
    }
  }
});

client.on("guildMemberAdd", async member => {
  console.log(`Se ha unido ${member.user.username}.`);
  let rol1 = await member.guild.roles.find(role => role.name === "Vendedores de Empanadas");
  let rol2 = await member.guild.roles.find(role => role.name === "Gran Manco");
  if (Math.random() < 0.5) {
    await member.addRole(rol1).catch(console.error);
  } else {
    await member.addRole(rol2).catch(console.error);
  }
  if (member.guild.channels.find(x => x.name === "bienvenidas")) {
    //console.log(`no se creo canal`);
  } else {
    //console.log(`se creo canal`);
    await member.guild.createChannel('bienvenidas', ['text']);
  }
  let canal = await member.guild.channels.find(x => x.name === "bienvenidas");
  canal.send(`Bienvenido ${member}!`);
});

client.on("guildMemberRemove", async member => {
  console.log(`Se ha ido ${member.user.username}.`);
  if (member.guild.channels.find(x => x.name === "bienvenidas")) {
    //console.log(`no se creo canal`);
  } else {
    //console.log(`se creo canal`);
    await member.guild.createChannel('bienvenidas', ['text']);
  }
  let canal = await member.guild.channels.find(x => x.name === "bienvenidas");
  await canal.send(`Se fue ${member} :o`);
});

client.on('message', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;
  let messageArray = message.content.split(" ");
  let cmd = messageArray[0];
  let args = messageArray.slice(1);
  const serverQueue = queue.get(message.guild.id);

  if (cmd === `${prefix}rip`) {
    const attachment = new Discord.Attachment('https://i.imgur.com/w3duR07.png');
    await message.channel.send(attachment);
  }

  if (cmd === `${prefix}sorteo`) {
    if (!args[0]) {
      message.channel.send("Debe poner el mensaje al cual se debera reaccionar.");
    } else {
      if (!sorteo) {
        sorteo = true;
        mensajesor = args.join(' ');
        autor = message.author;
        message.channel.send(`${mensajesor}`).then(msg => {
          autor = msg.author;
        });
      } else {
        message.channel.send('Aun no se finaliza el anterior sorteo.');
      }
    }
  }

  if (cmd === `${prefix}finalizar`) {
    if (!sorteo) {
      message.channel.send('Necesita iniciar un sorteo para usar este comando.');
    } else {
      if (!participantes[0]) {
        message.channel.send("Nadie participo en el sorteo.");
      } else {
        sorteo = false;
        console.log(participantes);
        let ganador = Math.floor(Math.random() * participantes.length);
        message.channel.send(`El ganador es ${participantes[ganador]}.`);
        participantes = [];
      }
    }
  }

  if (cmd === `${prefix}avatar`) {
    const avatar = await message.author.avatarURL;
    await message.reply(avatar);
  }

  if (cmd === `${prefix}ping`) {
    await message.channel.send(`${Math.round(client.ping)} ms.`);
  }

  if (cmd === `${prefix}join` || cmd === `${prefix}summon`) {
    if (message.member.voiceChannel) {
      if (message.member.voiceChannel.connection) {
        await message.channel.send('Actualmente estoy conectado al chat de voz.')
          .then(async msg => {
            await msg.delete(t);
          })
          .catch(console.error);
      } else {
        const channel = await message.member.voiceChannel;
        await channel.join();
        //console.log(`Conectado a ${channel.name}.`);
      }
    } else {
      await message.channel.send('Debes estar conectado a un canal de voz.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    }
  }

  if (cmd === `${prefix}play` || cmd === `${prefix}p`) {
    let voice = await message.member.voiceChannel;
    if (!voice) {
      await message.channel.send('Debes estar conectado a un canal de voz.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else {
      let permissions = voice.permissionsFor(message.client.user);
      if (!permissions.has('CONNECT')) {
        await message.channel.send('No tengo permisos suficientes para conectarme al canal de voz.')
          .then(async msg => {
            await msg.delete(t);
          })
          .catch(console.error);
      } else if (!permissions.has('SPEAK')) {
        await message.channel.send('No tengo permisos suficientes para hablar en este canal de voz.')
          .then(async msg => {
            await msg.delete(t);
          })
          .catch(console.error);
      }
      if (!args[0]) {
        await message.channel.send('Faltan argumentos en el comando.')
          .then(async msg => {
            await msg.delete(t);
          })
          .catch(console.error);
      } else {
        try {
          var video = await youtube.getVideo(args[0]);
        } catch (error) {
          try {
            var videos = await youtube.searchVideos(args, 1);
            var video = await youtube.getVideoByID(videos[0].id);
          } catch (err) {
            console.error(err);
            await message.channel.send("No hubo resultados en la b\u00FAsqueda.")
              .then(async msg => {
                await msg.delete(t);
              })
              .catch(console.error);
          }
        }
        //console.log(video);
        const song = {
          id: video.id,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.id}`,
          urlChannel: `https://www.youtube.com/channel/${video.channel.id}`,
          imagen: video.thumbnails.default.url,
          hours: video.duration.hours,
          minutes: video.duration.minutes,
          seconds: video.duration.seconds,
          channel: video.channel.title,
          by: message.member
        };

        if (!serverQueue) {
          const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: voice,
            connection: null,
            songs: [],
            volume: 3,
            playing: true,
            autoplay: false
          };

          queue.set(message.guild.id, queueConstruct);
          queueConstruct.songs.push(song);
          queueConstruct.autoplay = autoplay;

          try {
            let connection = await voice.join();
            queueConstruct.connection = connection;
            play(message.guild, queueConstruct.songs[0]);
          } catch (error) {
            console.error(`Error al conectar: ${error}`);
            await queue.delete(message.guild.id);
          }
        } else {
          serverQueue.songs.push(song);
          serverQueue.autoplay = autoplay;
          if (parseInt(song.hours) < 10) {
            var hours = `0${song.hours}`;
          } else {
            var hours = `${song.hours}`;
          }

          if (parseInt(song.minutes) < 10) {
            var minutes = `0${song.minutes}`;
          } else {
            var minutes = `${song.minutes}`;
          }

          if (parseInt(song.seconds) < 10) {
            var seconds = `0${song.seconds}`;
          } else {
            var seconds = `${song.seconds}`;
          }

          var scst = 0;
          var mnst = 0;
          var hrst = 0;

          for (var i = 0; i < serverQueue.songs.length; i++) {
            scst = scst + serverQueue.songs[i].seconds;
            mnst = mnst + serverQueue.songs[i].minutes;
            hrst = hrst + serverQueue.songs[i].hours;
          }

          var timestream = serverQueue.connection.dispatcher.time;
          let currentstream = msToTime(timestream);

          var cts = scst + (mnst * 60) + (hrst * 60 * 60) - (currentstream[0] * 60 * 60) - (currentstream[1] * 60) - currentstream[0]; //tiempo total en segundos

          var scs = cts % 60;
          var j = (cts - scs) / 60;
          var mns = j % 60;
          var hrs = (j - mns) / 60;

          if (hrs < 10) {
            hrs = `0${hrs}`;
          } else {
            hrs = `${hrs}`;
          }

          if (mns < 10) {
            mns = `0${mns}`;
          } else {
            mns = `${mns}`;
          }

          if (scs < 10) {
            scs = `0${scs}`;
          } else {
            scs = `${scs}`;
          }


          //console.log(serverQueue.songs);
          let embed = new Discord.RichEmbed()
            .setAuthor('🎵 Agregado a la lista', song.by.user.avatarURL)
            .setColor(color)
            .setThumbnail(song.imagen)
            .addField(`T\u00EDtulo`, `[${song.title}](${song.url})`)
            .addField('Duraci\u00F3n', `${hours}:${minutes}:${seconds}`, true)
            .addField('Canal', `[${serverQueue.songs[0].channel}](${serverQueue.songs[0].urlChannel})`, true)
            .addField('Tiempo estimado para reproducirse', `${hrs}:${mns}:${scs}`, true)
            .addField('Posici\u00F3n en la lista', `${serverQueue.songs.indexOf(song)}`, true);
          await message.channel.send(embed);
        }
        return undefined;
      }
    }
  }

  if (cmd === `${prefix}skip` || cmd === `${prefix}s`) {
    if (!message.member.voiceChannel) {
      await message.channel.send('Debes estar conectado a un canal de voz.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else if (!message.member.voiceChannel.connection) {
      await message.channel.send('No estoy conectado a ningun chat de voz.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else {
      if (!serverQueue) {
        await message.channel.send("La lista est\u00E1 vac\u00EDa.")
          .then(async msg => {
            await msg.delete(t);
          })
          .catch(console.error);
      } else {
        await serverQueue.connection.dispatcher.end();
        await message.react('👌');
        return undefined;
      }
    }
  }

  if (cmd === `${prefix}remove`) {
    if (!message.member.voiceChannel) {
      message.channel.send('Debes estar conectado a un canal de voz.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (!message.member.voiceChannel.connection) {
      message.channel.send('No estoy conectado a ningun chat de voz.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else {
      if (!serverQueue) {
        message.channel.send("La lista est\u00E1 vac\u00EDa.")
          .then(msg => {
            msg.delete(t);
          })
          .catch(console.error);
      } else if (!args[0]) {
        message.channel.send("Faltan argumentos.")
          .then(msg => {
            msg.delete(t);
          })
          .catch(console.error);
      } else if (isNaN(parseInt(args[0]))) {
        message.channel.send("Se debe ingresar un valor n\u00FAmerico.")
          .then(msg => {
            msg.delete(t);
          })
          .catch(console.error);
      } else if (parseInt(args[0]) < 1 || parseInt(args[0]) > serverQueue.songs.length - 1) {
        message.channel.send("Canci\u00F3n no disponible en la lista.")
          .then(msg => {
            msg.delete(t);
          })
          .catch(console.error);
      } else {
        message.react('👌');
        const r = serverQueue.songs[args[0]].title;
        serverQueue.songs.splice(args[0], 1);
        message.channel.send(`Se ha removido **${r}** de la lista.`)
          .then(msg => {
            msg.delete(t);
          })
          .catch(console.error);
        return undefined;
      }
    }
  }

  if (cmd === `${prefix}move`) {
    const move = args[0];
    const to = args[1];
    if (!message.member.voiceChannel) {
      message.channel.send('Debes estar conectado a un canal de voz.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (!message.member.voiceChannel.connection) {
      message.channel.send('No estoy conectado a ningun chat de voz.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else {
      if (!serverQueue) {
        message.channel.send("La lista est\u00E1 vac\u00EDa.")
          .then(msg => {
            msg.delete(t);
          })
          .catch(console.error);
      } else if (!move || !to) {
        message.channel.send("Faltan argumentos.")
          .then(msg => {
            msg.delete(t);
          })
          .catch(console.error);
      } else if (isNaN(parseInt(move)) || isNaN(parseInt(to))) {
        message.channel.send("Se debe ingresar valores n\u00FAmericos.")
          .then(msg => {
            msg.delete(t);
          })
          .catch(console.error);
      } else if ((parseInt(move) < 1 || parseInt(move) > serverQueue.songs.length - 1) || (parseInt(to) < 1 || parseInt(to) > serverQueue.songs.length - 1)) {
        message.channel.send("Canci\u00F3n no disponible en la lista.")
          .then(msg => {
            msg.delete(t);
          })
          .catch(console.error);
      } else if (parseInt(move) === parseInt(to)) {
        message.channel.send(`No se puede cambiar de posici\u00F3n con la misma canci\u00F3n.`)
          .then(msg => {
            msg.delete(t);
          })
          .catch(console.error);
      } else {
        message.react('👌');
        const a = serverQueue.songs[parseInt(move)];
        const b = serverQueue.songs[parseInt(to)];
        serverQueue.songs[parseInt(move)] = b;
        serverQueue.songs[parseInt(to)] = a;
        message.channel.send(`Se ha movido **${a.title}** por **${b.title}**.`)
          .then(msg => {
            msg.delete(t);
          })
          .catch(console.error);
        return undefined;
      }
    }
  }

  if (cmd === `${prefix}vol` || cmd === `${prefix}volume` || cmd === `${prefix}v`) {
    if (!message.member.voiceChannel) {
      message.channel.send('Debes estar conectado a un canal de voz.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (!message.member.voiceChannel.connection) {
      message.channel.send('No estoy conectado a ningun chat de voz.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (!serverQueue) {
      message.channel.send("Se debe reproducir una canci\u00F3n antes.")
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (!args[0]) {
      message.channel.send(`El volumen actual es de ${serverQueue.volume}.`)
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (isNaN(parseInt(args[0]))) {
      message.channel.send('Debe de ingresar un valor n\u00FAmerico.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (parseInt(args[0]) < 0 || parseInt(args[0]) > 10) {
      message.channel.send('Debe de ingresar valores entre 0 y 10.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else {
      serverQueue.volume = parseInt(args[0]);
      serverQueue.connection.dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
      return message.channel.send(`Se ha ajustado el volumen a ${serverQueue.volume}.`)
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    }
  }

  if (cmd === `${prefix}pause`) {
    if (!message.member.voiceChannel) {
      message.channel.send('Debes estar conectado a un canal de voz.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (!message.member.voiceChannel.connection) {
      message.channel.send('No estoy conectado a ningun chat de voz.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (!serverQueue || !serverQueue.playing) {
      message.channel.send('Actualmente no se esta reproduciendo nada.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else {
      serverQueue.playing = false;
      serverQueue.connection.dispatcher.pause();
      message.react('⏸');
      return undefined;
    }
  }

  if (cmd === `${prefix}resume`) {
    if (!message.member.voiceChannel) {
      message.channel.send('Debes estar conectado a un canal de voz.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (!message.member.voiceChannel.connection) {
      message.channel.send('No estoy conectado a ningun chat de voz.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (serverQueue && serverQueue.playing) {
      message.channel.send('La m\u00FAsica ya est\u00E1 reanudada.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else if (!serverQueue) {
      message.channel.send('Actualmente no se esta reproduciendo nada.')
        .then(msg => {
          msg.delete(t);
        })
        .catch(console.error);
    } else {
      serverQueue.playing = true;
      serverQueue.connection.dispatcher.resume();
      message.react('⏯');
    }
    return undefined;
  }

  if (cmd === `${prefix}q` || cmd === `${prefix}queue`) {
    if (!serverQueue) {
      await message.channel.send("La lista est\u00E1 vac\u00EDa.")
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
      return undefined;
    } else {

      if (serverQueue.songs.length > 1) {

        var scst = 0;
        var mnst = 0;
        var hrst = 0;

        for (var i = 1; i < serverQueue.songs.length; i++) {
          scst = scst + serverQueue.songs[i].seconds;
          mnst = mnst + serverQueue.songs[i].minutes;
          hrst = hrst + serverQueue.songs[i].hours;
        }

        var cts = scst + (mnst * 60) + (hrst * 60 * 60);

        var scs = cts % 60;
        var j = (cts - scs) / 60;
        var mns = j % 60;
        var hrs = (j - mns) / 60;

        if (hrs < 10) {
          hrs = `0${hrs}`;
        } else {
          hrs = `${hrs}`;
        }

        if (mns < 10) {
          mns = `0${mns}`;
        } else {
          mns = `${mns}`;
        }

        if (scs < 10) {
          scs = `0${scs}`;
        } else {
          scs = `${scs}`;
        }

        let index = 1;
        let canciones = serverQueue.songs.slice(1);
        if (canciones.length > 1) {
          let mensaje = new Discord.RichEmbed()
            .setColor(color)
            .addField(`Lista actual en ${message.guild.name}`, `${canciones.map(song => `${index++}) [${song.title}](${song.url})`).join('\n')}`)
            .addField('En reproducci\u00F3n', `[${serverQueue.songs[0].title}](${serverQueue.songs[0].url})`)
            .setFooter(`${canciones.length} canciones en la lista | Tiempo de la lista: ${hrs}:${mns}:${scs}`);
          await message.channel.send(mensaje);
        } else {
          let mensaje = new Discord.RichEmbed()
            .setColor(color)
            .addField(`Lista actual en ${message.guild.name}`, `${canciones.map(song => `${index++}) [${song.title}](${song.url})`).join('\n')}`)
            .addField('En reproducci\u00F3n', `[${serverQueue.songs[0].title}](${serverQueue.songs[0].url})`)
            .setFooter(`${canciones.length} canci\u00F3n en la lista | Tiempo total de la lista: ${hrs}:${mns}:${scs}`);
          await message.channel.send(mensaje);
        }
      } else {
        let mensaje = new Discord.RichEmbed()
          .setColor(color)
          .addField(`Lista actual en ${message.guild.name}`, 'Vac\u00EDa')
          .addField('En reproducci\u00F3n', `${serverQueue.songs[0].title}`);
        await message.channel.send(mensaje);
      }
    }
  }

  if (cmd === `${prefix}np` || cmd === `${prefix}nowplaying`) {
    if (!message.member.voiceChannel) {
      await message.channel.send('Debes estar conectado a un canal de voz.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else if (!message.member.voiceChannel.connection) {
      await message.channel.send('No estoy conectado a ningun chat de voz.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else if (!serverQueue) {
      await message.channel.send("Actualmente no se esta reproduciendo nada.")
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else {

      const request = serverQueue.songs[0].by;

      if (parseInt(serverQueue.songs[0].hours) < 10) {
        var hours = `0${serverQueue.songs[0].hours}`;
      } else {
        var hours = `${serverQueue.songs[0].hours}`;
      }

      if (parseInt(serverQueue.songs[0].minutes) < 10) {
        var minutes = `0${serverQueue.songs[0].minutes}`;
      } else {
        var minutes = `${serverQueue.songs[0].minutes}`;
      }

      if (parseInt(serverQueue.songs[0].seconds) < 10) {
        var seconds = `0${serverQueue.songs[0].seconds}`;
      } else {
        var seconds = `${serverQueue.songs[0].seconds}`;
      }

      let secT = (serverQueue.songs[0].hours * 60 * 60) + (serverQueue.songs[0].minutes * 60) + serverQueue.songs[0].seconds;

      let time = serverQueue.connection.dispatcher.time;
      let currentTime = msToTime(time);

      let secCur = (parseInt(currentTime[0]) * 60 * 60) + (parseInt(currentTime[1]) * 60) + parseInt(currentTime[2]);

      let string = contador(secCur, secT);

      if (parseInt(serverQueue.songs[0].hours) === 0) {
        var mensaje = new Discord.RichEmbed()
          .setColor(color)
          .setThumbnail(serverQueue.songs[0].imagen)
          .addField('En reproducci\u00F3n', `[${serverQueue.songs[0].title}](${serverQueue.songs[0].url}) - [${serverQueue.songs[0].channel}](${serverQueue.songs[0].urlChannel}) [${request}]`)
          .addField('Duraci\u00F3n', `${string}\n[${currentTime[1]}m ${currentTime[2]}s / ${minutes}m ${seconds}s]`, true);
      } else {
        var mensaje = new Discord.RichEmbed()
          .setColor(color)
          .setThumbnail(serverQueue.songs[0].imagen)
          .addField('En reproducci\u00F3n', `[${serverQueue.songs[0].title}](${serverQueue.songs[0].url}) - [${serverQueue.songs[0].channel}](${serverQueue.songs[0].urlChannel}) [${request}]`)
          .addField('Duraci\u00F3n', `${string}\n[${currentTime[0]}h ${currentTime[1]}m ${currentTime[2]}s / ${hours}h ${minutes}m ${seconds}s]`, true);
      }
      await message.channel.send(mensaje);
    }
    return undefined;
  }

  if (cmd === `${prefix}stop`) {
    if (!message.member.voiceChannel) {
      await message.channel.send('Debes estar conectado a un canal de voz.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else if (!message.member.voiceChannel.connection) {
      await message.channel.send('No estoy conectado a ningun chat de voz.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else if (!serverQueue) {
      await message.channel.send('La lista est\u00E1 vac\u00EDa.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else {
      await message.react('⏹');
      serverQueue.songs = [];
      autoplay = false;
      await serverQueue.connection.dispatcher.end();
      return undefined;
    }
  }

  if (cmd === `${prefix}leave` || cmd === `${prefix}fuckoff`) {
    if (!message.member.voiceChannel) {
      await message.channel.send('Debes estar conectado a un canal de voz.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else if (!message.member.voiceChannel.connection) {
      await message.channel.send('No estoy conectado a ningun chat de voz.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else if (!serverQueue) {
      autoplay = false;
      await message.member.voiceChannel.leave();
      await message.react('👋');
      return undefined;
    } else {
      serverQueue.songs = [];
      autoplay = false;
      await serverQueue.connection.dispatcher.end();
      await message.member.voiceChannel.leave();
      await message.react('👋');
      return undefined;
    }
  }

  if (cmd === `${prefix}autoplay` || cmd === `${prefix}ap`) {
    if (!message.member.voiceChannel) {
      await message.channel.send('Debes estar conectado a un canal de voz.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else if (!autoplay) {
      autoplay = true;
      const channel = await message.member.voiceChannel;
      channel.join();
      await message.channel.send('Se **activo** la reproducci\u00F3n autom\u00E1tica.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    } else {
      autoplay = false;
      await message.channel.send('Se **desactivo** la reproducci\u00F3n autom\u00E1tica.')
        .then(async msg => {
          await msg.delete(t);
        })
        .catch(console.error);
    }
  }

  if (cmd === `${prefix}clear`) {
    let n = parseInt(args[0]);
    if (message.member.hasPermission("MANAGE_MESSAGES")) {
      if (isNaN(n)) {
        await message.channel.send(`Debe ingresar un n\u00FAmero.`).then(msg => {
          msg.delete(t);
        });
      } else if (n > 30) {
        await message.channel.send(`No se pueden borrar tantos mensajes.`).then(msg => {
          msg.delete(t);
        });
      } else if (n < 0) {
        await message.channel.send(`Se deben ingresar cantidades positivas.`).then(async msg => {
          await msg.delete(t);
        });
      } else if (n === 0) {
        await message.channel.send(`Borrar 0 mensajes, really? xd`).then(async msg => {
          await msg.delete(t);
        });
      } else if (n === 1) {
        await message.channel.bulkDelete(n + 1).then(async () => {
          await message.channel.send(`Se ha borrado ${n} mensaje.`).then(async msg => {
            await msg.delete(t);
          });
        });
      } else {
        await message.channel.bulkDelete(n + 1).then(async () => {
          await message.channel.send(`Se han borrado ${n} mensajes.`).then(async msg => {
            await msg.delete(t);
          });
        });
      }
    } else {
      await message.channel.send('No tiene los permisos necesarios para ejecutar \u00E9ste comando.')
        .then(async msg => {
          await msg.delete(t);
        });
    }
  }

  if (cmd === `${prefix}serverInfo` || cmd === `${prefix}serverinfo` || cmd === `${prefix}si`) {
    let icono = await message.guild.iconURL;
    let mensaje = new Discord.RichEmbed()
      .setDescription("Informaci\u00F3n del servidor")
      .setColor(color)
      .setThumbnail(icono)
      .addField("Nombre del servidor", message.guild.name, true)
      .addField("Fecha de creaci\u00F3n", message.guild.createdAt, true)
      .addField("Total de usuarios", message.guild.memberCount, true)
      .addField("Creador del servidor", message.guild.owner.user.tag, true);
    await message.channel.send(mensaje);
  }

  if (cmd === `${prefix}userInfo` || cmd === `${prefix}userinfo` || cmd === `${prefix}ui`) {
    let icono = await message.author.displayAvatarURL;
    let mensaje = new Discord.RichEmbed()
      .setDescription(`Informaci\u00F3n de ${message.author.username}`)
      .setThumbnail(icono)
      .setColor(color)
      .addField(`Te uniste al servidor`, message.member.joinedAt, true)
      .addField(`Te uniste a discord`, message.author.createdAt, true);
    await message.channel.send(mensaje);
  }

  if (cmd === `${prefix}help`) {
    message.react('✌');
    mensaje = new Discord.RichEmbed()
      .setDescription("Comandos disponibles")
      .setColor(color)
      .addField('Prefijo', `${prefix}`)
      .addField('Comandos', `rip, ping, serverInfo, userInfo, clear, avatar`)
      .addField('M\u00FAsica', `join, play, skip, remove, move, volume, pause, resume, queue, nowplaying, stop, leave, autoplay (beta)`);
    await message.channel.send(mensaje);
  }
});

async function play(guild, song) {

  const serverQueue = await queue.get(guild.id);
  serverQueue.autoplay = autoplay;

  //console.log(cancionAnterior);

  if (serverQueue.autoplay) {
    if (!song) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&relatedToVideoId=${cancionAnterior.id}&type=video&key=${GOOGLE_API_KEY}`;
      var videos = await youtube.searchVideos(url);

      if (Math.random() < 0.7) {
        var video = await youtube.getVideoByID(videos[0].id);
      } else {
        var video = await youtube.getVideoByID(videos[1].id);
      }
      //console.log(video);
      const song = {
        id: video.id,
        title: video.title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        urlChannel: `https://www.youtube.com/channel/${video.channel.id}`,
        imagen: video.thumbnails.default.url,
        hours: video.duration.hours,
        minutes: video.duration.minutes,
        seconds: video.duration.seconds,
        channel: video.channel.title,
        by: client.user
      };
      serverQueue.songs.push(song);
    }
  } else {
    if (!song) {
      //serverQueue.voiceChannel.leave();
      await queue.delete(guild.id);
      return;
    }
  }

  var user = serverQueue.songs[0].by;
  //console.log(serverQueue.songs);
  const dispatcher = await serverQueue.connection.playStream(Ytdl(serverQueue.songs[0].url, { filter: 'audioonly' }))
    .on('end', () => {
      //console.log('Canci\u00F3n terminada.');
      cancionAnterior = serverQueue.songs.shift();
      mesaj.delete();
      play(guild, serverQueue.songs[0]);
    })
    .on('error', error => {
      console.error(error);
    });
  await dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  let mensaje = new Discord.RichEmbed()
    .setColor(color)
    .addField("En reproducci\u00F3n", `[${serverQueue.songs[0].title}](${serverQueue.songs[0].url}) - [${serverQueue.songs[0].channel}](${serverQueue.songs[0].urlChannel}) [${user}]`);
  await serverQueue.textChannel.send(mensaje)
    .then(msg => {
      mesaj = msg;
    })
    .catch(console.error);
}

function msToTime(s) {
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;

  if (secs < 10) {
    secs = `0${secs}`;
  } else {
    secs = `${secs}`;
  }

  if (mins < 10) {
    mins = `0${mins}`;
  } else {
    mins = `${mins}`;
  }

  if (hrs < 10) {
    hrs = `0${hrs}`;
  } else {
    hrs = `${hrs}`;
  }

  var times = [hrs, mins, secs];

  return times;
}

function contador(seg, segT) {
  let cur = Math.floor((seg / segT) * 100);
  let string = []
  for (let i = 0; i < 20; i++) {
    if (cur * 2 >= (i * 10) && cur * 2 < (i * 10) + 10) {
      string.push('🔵');
    } else {
      string.push('▬');
    }
  }
  string = string.join('');
  return string;
}

client.login(config.token);
