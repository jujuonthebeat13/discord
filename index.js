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
  EmbedBuilder,
  ChannelType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= CONFIG =================

const GUILD_ID = "1458135503974170788"; // TON SERVEUR
const MUSIC_FORUM_ID = "1461146580148158589"; // FORUM MUSOC EVENT

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

  const guild = await client.guilds.fetch(GUILD_ID);

  await guild.commands.set([
    new SlashCommandBuilder()
      .setName("find-collab")
      .setDescription("Find members by creative role")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("create-event")
      .setDescription("Create a music event post")
      .toJSON()
  ]);

  console.log("✅ Slash commands registered");
});

// ================= INTERACTIONS =================

client.on(Events.InteractionCreate, async interaction => {

  if (!interaction.guild) return;

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
    if (!role) {
      return interaction.update({ content: "❌ Role not found", components: [] });
    }

    const members = role.members.map(m => `<@${m.user.id}>`);

    const embed = new EmbedBuilder()
      .setTitle(`${role.name} — Available members`)
      .setDescription(
        members.length ? members.slice(0, 20).join("\n") : "_No members found_"
      )
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
          .setLabel("Date & time")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("March 22 • 8PM")
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
          .setCustomId("links")
          .setLabel("Links / Poster / Color")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(
            "https://poster.png\nhttps://instagram.com/...\n#ff0055"
          )
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
    const location = interaction.fields.getTextInputValue("location") || "TBA";
    const rawLinks = interaction.fields.getTextInputValue("links") || "";

    const lines = rawLinks.split("\n").map(l => l.trim()).filter(Boolean);

    const colorLine = lines.find(l => l.startsWith("#"));
    const color = colorLine ? parseInt(colorLine.slice(1), 16) : 0x1abc9c;

    const imageLink = lines.find(l =>
      l.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );

    const links = lines.filter(l => l.startsWith("http") && l !== imageLink);

    const embed = new EmbedBuilder()
      .setTitle(name)
      .setDescription(description)
      .setColor(color)
      .addFields(
        { name: "📅 Date & Time", value: date, inline: true },
        { name: "📍 Location", value: location, inline: true },
        {
          name: "🔗 Links",
          value: links.length ? links.join("\n") : "—"
        }
      )
      .setFooter({
        text: `Post made by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    if (imageLink) embed.setImage(imageLink);

    const forum = await interaction.guild.channels.fetch(MUSIC_FORUM_ID);

    if (!forum || forum.type !== ChannelType.GuildForum) {
      return interaction.reply({
        content: "❌ Music forum not found.",
        ephemeral: true
      });
    }

    await forum.threads.create({
      name: name,
      message: { embeds: [embed] }
    });

    await interaction.reply({
      content: "✅ Event successfully posted!",
      ephemeral: true
    });
  }
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);
