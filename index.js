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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= CONFIG =================

const GUILD_ID = "1458135503974170788";
const EVENT_THREAD_ID = "PUT_EXISTING_THREAD_ID_HERE";

// ================= READY =================

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);

  await guild.commands.set([
    new SlashCommandBuilder()
      .setName("create-event")
      .setDescription("Create a music event post")
  ]);

  console.log("✅ Slash command registered");
});

// ================= TEMP STORAGE =================

const eventCache = new Map();

// ================= INTERACTIONS =================

client.on(Events.InteractionCreate, async interaction => {

  // ---------- SLASH ----------
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
          .setCustomId("datetime")
          .setLabel("Date & time")
          .setPlaceholder("2026-03-22 • 20:00")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
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
          .setCustomId("links")
          .setLabel("Additional links")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
      )
    );

    await interaction.showModal(modal);
  }

  // ---------- MODAL ----------
  if (interaction.isModalSubmit() && interaction.customId === "event-modal") {

    eventCache.set(interaction.user.id, {
      name: interaction.fields.getTextInputValue("name"),
      description: interaction.fields.getTextInputValue("description"),
      datetime: interaction.fields.getTextInputValue("datetime"),
      ticket: interaction.fields.getTextInputValue("ticket"),
      links: interaction.fields.getTextInputValue("links")
    });

    const colorMenu = new StringSelectMenuBuilder()
      .setCustomId("color-select")
      .setPlaceholder("Select embed color")
      .addOptions([
        { label: "Teal", value: "1abc9c" },
        { label: "Purple", value: "9b59b6" },
        { label: "Red", value: "e74c3c" },
        { label: "Blue", value: "3498db" },
        { label: "Orange", value: "e67e22" }
      ]);

    await interaction.reply({
      content: "🎨 Choose a color for your event embed:",
      components: [new ActionRowBuilder().addComponents(colorMenu)],
      ephemeral: true
    });
  }

  // ---------- COLOR ----------
  if (interaction.isStringSelectMenu() && interaction.customId === "color-select") {

    const data = eventCache.get(interaction.user.id);
    if (!data) return;

    data.color = parseInt(interaction.values[0], 16);
    eventCache.set(interaction.user.id, data);

    await interaction.update({
      content: "🖼️ Send the event poster image now (or ignore to skip)",
      components: []
    });
  }
});

// ================= IMAGE LISTENER =================

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const data = eventCache.get(message.author.id);
  if (!data) return;

  const image = message.attachments.find(a =>
    a.contentType?.startsWith("image/")
  );

  const embed = new EmbedBuilder()
    .setTitle(data.name)
    .setDescription(data.description)
    .setColor(data.color || 0x1abc9c)
    .addFields(
      { name: "📅 Date & Time", value: data.datetime, inline: true },
      { name: "🎟 Tickets", value: data.ticket || "—", inline: true },
      {
        name: "🔗 Links",
        value: data.links || "—"
      }
    )
    .setFooter({
      text: `Post made by ${message.author.tag}`,
      iconURL: message.author.displayAvatarURL()
    });

  if (image) embed.setImage(image.url);

  const thread = await message.guild.channels.fetch(EVENT_THREAD_ID);
  if (!thread || !thread.isThread()) return;

  await thread.send({ embeds: [embed] });

  eventCache.delete(message.author.id);
  await message.reply("✅ Event posted successfully!");
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);

