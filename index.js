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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= CONFIG =================
const GUILD_ID = "1458135503974170788"; // <--- Met ton serveur ID
const EXISTING_THREAD_ID = "1461146580148158589"; // <--- Met l'ID du thread déjà existant

// Rôles créatifs
const CREATIVE_ROLE_IDS = [
  "1458140072221343846", // Musician
  "1458284994345570538", // Sound Engineer
  "1458140485393842207", // Graphic Designer
  "1458140400559722558", // Game Dev
  "1458285431165554910", // VFX
  "1458285481417638020", // Animation
  "1458285599101288559", // Video
  "1458285657423085764"  // Photo
];

// Couleurs simples
const COLOR_OPTIONS = [
  { label: "Teal", value: "1abc9c", color: 0x1abc9c },
  { label: "Blue", value: "3498db", color: 0x3498db },
  { label: "Purple", value: "9b59b6", color: 0x9b59b6 },
  { label: "Red", value: "e74c3c", color: 0xe74c3c }
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
client.on(Events.InteractionCreate, async interaction => {

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
          .setLabel("Date (e.g., March 22)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("time")
          .setLabel("Time (e.g., 8:00 PM)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("location")
          .setLabel("Location")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ticket")
          .setLabel("Ticket Link")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("external")
          .setLabel("External Link")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("image")
          .setLabel("Direct Image URL (Poster)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("color")
          .setLabel("Embed Color Hex (optional, e.g., #1abc9c)")
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
    const ticket = interaction.fields.getTextInputValue("ticket");
    const external = interaction.fields.getTextInputValue("external");
    const image = interaction.fields.getTextInputValue("image");
    const colorHex = interaction.fields.getTextInputValue("color");

    const color = colorHex ? parseInt(colorHex.replace("#",""), 16) : 0x1abc9c;

    const embed = new EmbedBuilder()
      .setTitle(name)
      .setDescription(description)
      .setColor(color)
      .addFields(
        { name: "**📅 Date**", value: date, inline: true },
        { name: "**⏰ Time**", value: time, inline: true },
        { name: "**📍 Location**", value: location || "TBA", inline: true },
        { name: "**🎟 Ticket**", value: ticket ? `[Get tickets here](${ticket})` : "—", inline: true },
        { name: "**🔗 More info**", value: external ? `[For more information](${external})` : "—", inline: false }
      )
      .setFooter({ text: `Post made by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    if (image) embed.setImage(image);

    // Envoie dans le thread existant
    const thread = await interaction.guild.channels.fetch(EXISTING_THREAD_ID);
    if (!thread || !thread.isThread()) {
      return interaction.reply({ content: "❌ Existing thread not found", ephemeral: true });
    }

    await thread.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Event posted in ${thread.name}`, ephemeral: true });
  }
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);
