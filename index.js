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
const GUILD_ID = "1458135503974170788"; // <-- Your server ID
const MUSIC_THREAD_ID = "1461146580148158589"; // <-- ID of the existing thread in the forum

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

// ================= READY =================
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
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
  } catch (err) {
    console.error("❌ Error registering commands:", err);
  }
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

  // ---------- /find-collab ----------
  if (interaction.isChatInputCommand() && interaction.commandName === "find-collab") {
    const roles = CREATIVE_ROLE_IDS
      .map(id => interaction.guild.roles.cache.get(id))
      .filter(Boolean)
      .map(role => ({ label: role.name, value: role.id }));

    if (!roles.length) return interaction.reply({ content: "❌ No roles found!", ephemeral: true });

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
    if (!role) return interaction.update({ content: "❌ Role not found", components: [] });

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
          .setLabel("Event name")
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
          .setCustomId("color")
          .setLabel("Embed color hex (optional, e.g., #1abc9c)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("image")
          .setLabel("Image URL (Poster)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ticket")
          .setLabel("Ticket link")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("additional")
          .setLabel("Additional links")
          .setStyle(TextInputStyle.Paragraph)
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
    const image = interaction.fields.getTextInputValue("image");
    const ticket = interaction.fields.getTextInputValue("ticket");
    const additional = interaction.fields.getTextInputValue("additional");
    const colorHex = interaction.fields.getTextInputValue("color");

    const color = colorHex ? parseInt(colorHex.replace("#",""), 16) : 0x1abc9c;

    const embed = new EmbedBuilder()
      .setTitle(name)
      .setDescription(description)
      .setColor(color)
      .addFields(
        { name: "📅 Date", value: date, inline: true },
        { name: "⏰ Time", value: time, inline: true },
        { name: "📍 Location", value: location || "TBA", inline: true },
        { name: "🎟 Ticket", value: ticket || "—", inline: true },
        { name: "🔗 Additional links", value: additional || "—" }
      )
      .setFooter({ text: `Post made by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    if (image) embed.setImage(image);

    // Post in existing thread (unarchive if needed)
    const thread = await interaction.guild.channels.fetch(MUSIC_THREAD_ID);
    if (!thread) return interaction.reply({ content: "❌ Music thread not found", ephemeral: true });

    if (thread.archived) await thread.setArchived(false);
    await thread.send({ embeds: [embed] });

    await interaction.reply({ content: `✅ Event posted in ${thread.name}`, ephemeral: true });
  }
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);
