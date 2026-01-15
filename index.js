const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  ActionRowBuilder, 
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

// ================= READY =================
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.commands.set([
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
          .setLabel("Poster URL (image)")
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

    // Post in existing thread
    const thread = await interaction.guild.channels.fetch(MUSIC_THREAD_ID);
    if (!thread) return interaction.reply({ content: "❌ Music thread not found", ephemeral: true });

    if (thread.archived) await thread.setArchived(false);

    await thread.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Event posted in ${thread.name}`, ephemeral: true });
  }

});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);
