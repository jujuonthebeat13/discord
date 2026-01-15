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
const GUILD_ID = "1458135503974170788"; // Your server ID
const MUSIC_THREAD_ID = "1461146580148158589"; // Existing thread in the forum

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

  // ---------- /create-event STEP 1 ----------
  if (interaction.isChatInputCommand() && interaction.commandName === "create-event") {
    const modal = new ModalBuilder()
      .setCustomId("event-step1")
      .setTitle("Create Music Event - Step 1");

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
          .setLabel("Date (dd/mm/yyyy)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("time")
          .setLabel("Time (24h)")
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

  // ---------- MODAL SUBMIT STEP 1 ----------
  if (interaction.isModalSubmit() && interaction.customId === "event-step1") {
    const step1Data = {
      name: interaction.fields.getTextInputValue("name"),
      description: interaction.fields.getTextInputValue("description"),
      date: interaction.fields.getTextInputValue("date"),
      time: interaction.fields.getTextInputValue("time"),
      location: interaction.fields.getTextInputValue("location")
    };

    // Store in user temporary cache (or you can use a Map)
    client.tempEventData = client.tempEventData || {};
    client.tempEventData[interaction.user.id] = step1Data;

    // Show STEP 2 modal
    const modal2 = new ModalBuilder()
      .setCustomId("event-step2")
      .setTitle("Create Music Event - Step 2");

    modal2.addComponents(
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
          .setLabel("Image URL (Direct link)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("color")
          .setLabel("Color (Red/Blue/Green/Purple/Orange)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      )
    );

    await interaction.showModal(modal2);
  }

  // ---------- MODAL SUBMIT STEP 2 ----------
  if (interaction.isModalSubmit() && interaction.customId === "event-step2") {
    const step2Data = {
      ticket: interaction.fields.getTextInputValue("ticket"),
      external: interaction.fields.getTextInputValue("external"),
      image: interaction.fields.getTextInputValue("image"),
      color: interaction.fields.getTextInputValue("color")
    };

    // Retrieve step 1
    const step1Data = client.tempEventData?.[interaction.user.id];
    if (!step1Data) return interaction.reply({ content: "❌ Step 1 data not found.", ephemeral: true });

    // Determine color
    let colorMap = {
      red: 0xD10C0C,
      blue: 0x3498db,
      green: 0x2ecc71,
      purple: 0x9b59b6,
      orange: 0xe67e22
    };
    let color = colorMap[(step2Data.color || "").toLowerCase()] || 0xD10C0C;

    // Format date (simple dd/mm/yyyy → 12 December 2026)
    let [dd, mm, yyyy] = step1Data.date.split("/");
    let monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    let formattedDate = dd && mm && yyyy ? `${parseInt(dd)} ${monthNames[parseInt(mm)-1]} ${yyyy}` : step1Data.date;

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle(step1Data.name)
      .setDescription(step1Data.description)
      .setColor(color)
      .addFields(
        { name: "**Date**", value: formattedDate, inline: true },
        { name: "**Time**", value: step1Data.time, inline: true },
        { name: "**Location**", value: step1Data.location || "TBA", inline: true },
        { name: "**Ticket**", value: step2Data.ticket ? `[Get tickets here](${step2Data.ticket})` : "—", inline: true },
        { name: "**Links**", value: step2Data.external ? `[For more information](${step2Data.external})` : "—", inline: false }
      )
      .setFooter({ text: `Posted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    if (step2Data.image) embed.setImage(step2Data.image);

    // Post in existing thread
    const thread = await interaction.guild.channels.fetch(MUSIC_THREAD_ID);
    if (!thread || !thread.isThread()) return interaction.reply({ content: "❌ Music thread not found", ephemeral: true });

    await thread.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Event posted in ${thread.name}`, ephemeral: true });

    // Cleanup temp data
    delete client.tempEventData[interaction.user.id];
  }
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);
