const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
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
  "1458285431165570538", // VFX
  "1458285481417638020", // Animation
  "1458285599101288559", // Video
  "1458285657423085764"  // Photo
];

const COLOR_OPTIONS = [
  { label: "Red", value: 0xD10C0C, color: 0xD10C0C },
  { label: "Blue", value: 0x3498DB, color: 0x3498DB },
  { label: "Green", value: 0x2ECC71, color: 0x2ECC71 },
  { label: "Purple", value: 0x9B59B6, color: 0x9B59B6 },
  { label: "Orange", value: 0xE67E22, color: 0xE67E22 }
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

    await interaction.reply({
      content: "Select a role to see members (menu coming soon).",
      ephemeral: true
    });
  }

  // ---------- /create-event ----------
  if (interaction.isChatInputCommand() && interaction.commandName === "create-event") {
    // Étape 1 : nom, description, date, heure, lieu
    const modal1 = new ModalBuilder()
      .setCustomId("event-step1")
      .setTitle("Create Music Event — Step 1");

    modal1.addComponents(
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

    await interaction.showModal(modal1);
  }

  // ---------- MODAL SUBMIT STEP 1 ----------
  if (interaction.isModalSubmit() && interaction.customId === "event-step1") {
    const step1Data = {
      name: interaction.fields.getTextInputValue("name"),
      description: interaction.fields.getTextInputValue("description"),
      date: interaction.fields.getTextInputValue("date"),
      time: interaction.fields.getTextInputValue("time"),
      location: interaction.fields.getTextInputValue("location")
    };

    // Étape 2 : image, ticket, lien externe, couleur
    const modal2 = new ModalBuilder()
      .setCustomId("event-step2")
      .setTitle("Create Music Event — Step 2");

    modal2.addComponents(
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
          .setCustomId("external")
          .setLabel("External link")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("color")
          .setLabel("Color (Red, Blue, Green, Purple, Orange) or leave blank")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      )
    );

    client.step1Data = client.step1Data || {};
    client.step1Data[interaction.user.id] = step1Data;

    await interaction.showModal(modal2);
  }

  // ---------- MODAL SUBMIT STEP 2 ----------
  if (interaction.isModalSubmit() && interaction.customId === "event-step2") {
    const step2Data = {
      image: interaction.fields.getTextInputValue("image"),
      ticket: interaction.fields.getTextInputValue("ticket"),
      external: interaction.fields.getTextInputValue("external"),
      colorName: interaction.fields.getTextInputValue("color")
    };

    const step1Data = client.step1Data[interaction.user.id];
    if (!step1Data) return interaction.reply({ content: "❌ Step 1 data missing!", ephemeral: true });

    // Déterminer couleur
    let color = 0xD10C0C; // default red
    if (step2Data.colorName) {
      const c = COLOR_OPTIONS.find(c => c.label.toLowerCase() === step2Data.colorName.toLowerCase());
      if (c) color = c.color;
    }

    // Créer embed
    const embed = new EmbedBuilder()
      .setTitle(step1Data.name)
      .setDescription(step1Data.description)
      .setColor(color)
      .addFields(
        { name: "**Date**", value: step1Data.date, inline: true },
        { name: "**Time**", value: step1Data.time, inline: true },
        { name: "**Location**", value: step1Data.location || "TBA", inline: true }
      )
      .setFooter({ text: `Post made by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    if (step2Data.image) embed.setImage(step2Data.image);
    if (step2Data.ticket) embed.addFields({ name: "🎟 Get tickets here", value: step2Data.ticket, inline: true });
    if (step2Data.external) embed.addFields({ name: "🔗 For more info", value: step2Data.external, inline: true });

    // Post in existing thread
    const thread = await interaction.guild.channels.fetch(MUSIC_THREAD_ID);
    if (!thread || !thread.isThread()) return interaction.reply({ content: "❌ Thread not found", ephemeral: true });

    await thread.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Event created in ${thread.name}!`, ephemeral: true });

    delete client.step1Data[interaction.user.id]; // cleanup
  }
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);
