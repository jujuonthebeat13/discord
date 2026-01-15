const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ================= CONFIG =================
const GUILD_ID = "1458135503974170788"; // Ton serveur
const MUSIC_THREAD_ID = "1461146580148158589"; // Thread existant pour poster

const CREATIVE_ROLE_IDS = [
  "1458140072221343846", // Musician
  "1458284994345570538", // Sound
  "1458140485393842207", // Design
  "1458140400559722558", // Game Dev
  "1458285431165554910", // VFX
  "1458285481417638020", // Animation
  "1458285599101288559", // Video
  "1458285657423085764"  // Photo
];

const COLOR_OPTIONS = [
  { label: "Red", value: "D10C0C", color: 0xD10C0C },
  { label: "Blue", value: "3498DB", color: 0x3498DB },
  { label: "Green", value: "2ECC71", color: 0x2ECC71 },
  { label: "Purple", value: "9B59B6", color: 0x9B59B6 },
  { label: "Orange", value: "E67E22", color: 0xE67E22 }
];

// ================= READY =================
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);

  await guild.commands.set([
    new SlashCommandBuilder()
      .setName("find-collab")
      .setDescription("Find members by creative role"),
    new SlashCommandBuilder()
      .setName("create-event")
      .setDescription("Create a music event post")
  ]);

  console.log("✅ Slash commands registered");
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async (interaction) => {

  // ---------- /find-collab ----------
  if (interaction.isChatInputCommand() && interaction.commandName === "find-collab") {
    const roles = CREATIVE_ROLE_IDS
      .map(id => interaction.guild.roles.cache.get(id))
      .filter(Boolean)
      .map(role => ({ label: role.name, value: role.id }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("select-role")
      .setPlaceholder("Select a creative role")
      .addOptions(roles);

    await interaction.reply({
      content: "Select a role to see available members:",
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });
  }

  // ---------- ROLE SELECT ----------
  if (interaction.isStringSelectMenu() && interaction.customId === "select-role") {
    await interaction.guild.members.fetch();
    const role = interaction.guild.roles.cache.get(interaction.values[0]);
    if (!role) return;

    const members = role.members.map(m => `<@${m.user.id}>`);
    const embed = new EmbedBuilder()
      .setTitle(`${role.name} — Available members`)
      .setDescription(members.length ? members.slice(0, 20).join("\n") : "_No members found_")
      .setColor(0x1abc9c);

    await interaction.update({ embeds: [embed], components: [] });
  }

  // ---------- /create-event ----------
  if (interaction.isChatInputCommand() && interaction.commandName === "create-event") {
    const modal = new ModalBuilder()
      .setCustomId("event-modal")
      .setTitle("Create Music Event");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("name")
          .setLabel("Event Name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("date")
          .setLabel("Date (DD/MM/YYYY)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("time")
          .setLabel("Time (HH:MM 24h)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("location")
          .setLabel("Location")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      )
    );

    await interaction.showModal(modal);
  }

  // ---------- MODAL SUBMIT ----------
  if (interaction.isModalSubmit() && interaction.customId === "event-modal") {
    const name = interaction.fields.getTextInputValue("name");
    const description = interaction.fields.getTextInputValue("description");
    const date = interaction.fields.getTextInputValue("date");
    const time = interaction.fields.getTextInputValue("time");
    const location = interaction.fields.getTextInputValue("location");

    // Couleur par défaut
    let color = 0xD10C0C;

    const embed = new EmbedBuilder()
      .setTitle(name)
      .setDescription(description)
      .setColor(color)
      .addFields(
        { name: "**Date**", value: date, inline: true },
        { name: "**Time**", value: time, inline: true },
        { name: "**Location**", value: location || "TBA", inline: true }
      )
      .setFooter({ text: `Post made by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    // Post in existing thread
    const thread = await interaction.guild.channels.fetch(MUSIC_THREAD_ID);
    if (!thread || !thread.isThread()) {
      return interaction.reply({ content: "❌ Music thread not found", ephemeral: true });
    }

    const message = await thread.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Event created in ${thread.name}. Reply with your poster, ticket link, external link, or select a color.`, ephemeral: true });

    // ---------- Collector for poster, links, color ----------
    const filter = m => m.author.id === interaction.user.id;
    const collector = thread.createMessageCollector({ filter, time: 10 * 60 * 1000, max: 1 });

    collector.on("collect", async m => {
      const lines = m.content.split("\n").map(l => l.trim()).filter(Boolean);
      let image, ticket, external;
      lines.forEach(l => {
        if (l.match(/\.(png|jpg|jpeg|gif|webp)$/i)) image = l;
        else if (!ticket) ticket = l;
        else external = l;
        if (l.startsWith("#")) color = parseInt(l.replace("#", ""),16);
      });

      const fields = [];
      if (ticket) fields.push({ name: "🎟 Get tickets here", value: ticket, inline: true });
      if (external) fields.push({ name: "🔗 For more info", value: external, inline: true });
      if (fields.length) embed.addFields(fields);
      if (image) embed.setImage(image);
      embed.setColor(color);

      await message.edit({ embeds: [embed] });
      await m.reply({ content: "✅ Event updated with image, links, and color.", ephemeral: true });
    });

    collector.on("end", collected => {
      if (collected.size === 0) {
        thread.send("⚠️ No additional info provided. Event kept basic.");
      }
    });
  }
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);
