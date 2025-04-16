require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
    ],
});

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

// Centralized image configuration
const IMAGE_CONFIG = {
    developer: {
        thumbnail: 'https://media.discordapp.net/attachments/1294639687952240682/1361931913274589225/172174951.png?ex=68008d6f&is=67ff3bef&hm=118882e2b15ef6cd948e0bdd38784d9b0554b902580a3bf50bd9eaffb103df48&=&format=webp&quality=lossless', // Replace with your actual thumbnail URL
        banner: 'https://share.creavite.co/67ff358f5502193c79bac8a0.gif', // Replace with your actual banner URL
    },
    owner: {
        thumbnail: 'https://i.imgur.com/yourPrestigeThumbnail.jpg', // Replace with your actual thumbnail URL
        banner: 'https://i.imgur.com/yourPrestigeBanner.jpg', // Replace with your actual banner URL
    },
    fallback: 'https://via.placeholder.com/150?text=Fallback+Image', // Fallback image
};

// Function to get valid image URL with fallback
const getValidImage = (primaryUrl, guild, client) => {
    console.log(`Checking image URL: ${primaryUrl}`);
    if (primaryUrl && typeof primaryUrl === 'string' && primaryUrl.startsWith('http')) {
        return primaryUrl;
    }
    const serverIcon = guild?.iconURL({ dynamic: true, size: 1024 });
    if (serverIcon) {
        console.log(`Using server icon as fallback: ${serverIcon}`);
        return serverIcon;
    }
    const botAvatar = client.user.displayAvatarURL();
    if (botAvatar) {
        console.log(`Using bot avatar as fallback: ${botAvatar}`);
        return botAvatar;
    }
    console.log(`Using default fallback: ${IMAGE_CONFIG.fallback}`);
    return IMAGE_CONFIG.fallback;
};

// Function to update bot presence
const updatePresence = async () => {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    try {
        const members = await guild.members.fetch();
        const onlineStatuses = ['online', 'idle', 'dnd'];

        const onlineMembers = members.filter(member =>
            !member.user.bot && member.presence?.status && onlineStatuses.includes(member.presence.status)
        ).size;

        const totalHumans = members.filter(member => !member.user.bot).size;

        client.user.setActivity(`${onlineMembers}/${totalHumans} online`, {
            type: ActivityType.Watching,
        });

        console.log(`🔹 Updated status: ${onlineMembers}/${totalHumans} online (excluding bots)`);
    } catch (error) {
        console.error("❌ Error updating presence:", error);
    }
};

// Register Slash Commands with Discord
const registerCommands = async () => {
    const commands = [
        new SlashCommandBuilder().setName('active').setDescription('Shows active members'),
        new SlashCommandBuilder().setName('developer').setDescription('Shows developer info'),
        new SlashCommandBuilder().setName('owner').setDescription('Shows server owner info'),
    ]
        .map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
};

// Handle interaction (slash command and buttons)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    const { guild } = interaction;

    // Handle Button Interactions
    if (interaction.isButton()) {
        try {
            const url = interaction.customId;
            await interaction.reply({ content: `🔗 Opening ${url} in your browser!`, ephemeral: true });
        } catch (error) {
            console.error('Error handling button interaction:', error);
            await interaction.reply({ content: '❌ Could not process your request.', ephemeral: true });
        }
        return;
    }

    const { commandName } = interaction;
    console.log(`📢 Slash Command Triggered: ${commandName}`);

    if (commandName === 'active') {
        try {
            const members = await guild.members.fetch();
            const humanMembers = members.filter(member => !member.user.bot);
            const onlineMembers = humanMembers.filter(
                member => member.presence?.status && ['online', 'idle', 'dnd'].includes(member.presence.status)
            );

            const activeCount = onlineMembers.size;
            const totalCount = humanMembers.size;

            const thumbnailUrl = getValidImage(
                guild.iconURL({ dynamic: true, size: 1024 }),
                guild,
                client
            );

            if (activeCount === 0) {
                await interaction.reply({
                    content: `❌ No active members are online at the moment. (${activeCount}/${totalCount})`,
                    ephemeral: true
                });
                return;
            }

            const activeEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('✨ Active Members')
                .setDescription(`**${activeCount}/${totalCount}** members are online in **${guild.name}**!`)
                .setThumbnail(thumbnailUrl)
                .setFooter({ 
                    text: `👤 Requested by ${interaction.user.username} • ${new Date().toLocaleTimeString()}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                })
                .setTimestamp();

            await interaction.reply({ embeds: [activeEmbed] });
        } catch (error) {
            console.error('Error fetching active members:', error);
            await interaction.reply({
                content: '❌ Something went wrong while fetching active members. Try again later!',
                ephemeral: true
            });
        }
    }

    if (commandName === 'developer') {
        try {
            const thumbnailUrl = getValidImage(IMAGE_CONFIG.developer.thumbnail, guild, client);
            const bannerUrl = getValidImage(IMAGE_CONFIG.developer.banner, guild, client);

            console.log(`Developer Embed - Thumbnail: ${thumbnailUrl}, Banner: ${bannerUrl}`);

            const developerEmbed = new EmbedBuilder()
                .setTitle('🚀 Xen Official - The Code Maestro')
                .setDescription(
                    `**Welcome to my world of code!** I'm the developer behind this bot, crafting epic tools for **${guild.name}**.\n\n` +
                    `🌟 **Who Am I?** A passionate coder, gamer, and content creator.\n` +
                    `💻 **Tech Stack**: JavaScript, Node.js, Discord.js, and a dash of magic.\n` +
                    `🎯 **Goal**: Elevate your Discord experience with awesome bots.\n` +
                    `📬 **Connect**: Hit me up on my socials below!`
                )
                .addFields(
                    { name: '🏗️ Notable Projects', value: 'Custom Discord bots, community tools', inline: true },
                    { name: '🎮 Hobbies', value: 'Gaming, coding, video editing', inline: true },
                    { name: '🌍 Community', value: `${guild.name} (${guild.memberCount} members)`, inline: true }
                )
                .setColor('#1E90FF')
                .setThumbnail(thumbnailUrl)
                .setImage(bannerUrl)
                .setFooter({ 
                    text: 'Powered by XEN DEVELOPMENT 🌟 Built with 💖', 
                    iconURL: client.user.displayAvatarURL() 
                })
                .setTimestamp();

            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('GitHub')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://github.com/Xen-Dev23')
                        .setEmoji('📜'),
                    new ButtonBuilder()
                        .setLabel('TikTok')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://www.tiktok.com/@drei_xen')
                        .setEmoji('🎥'),
                    new ButtonBuilder()
                        .setLabel('YouTube')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://www.youtube.com/@Xen_Moto')
                        .setEmoji('▶️')
                );

            await interaction.reply({ embeds: [developerEmbed], components: [buttonRow] });
        } catch (error) {
            console.error('Error handling developer command:', error);
            await interaction.reply({
                content: '❌ Failed to load developer info. Please try again later!',
                ephemeral: true
            });
        }
    }
    
    if (commandName === 'owner') {
        try {
            const thumbnailUrl = getValidImage(IMAGE_CONFIG.owner.thumbnail, guild, client);
            const bannerUrl = getValidImage(IMAGE_CONFIG.owner.banner, guild, client);

            console.log(`Owner Embed - Thumbnail: ${thumbnailUrl}, Banner: ${bannerUrl}`);

            const ownerEmbed = new EmbedBuilder()
                .setTitle('👑 Prestige Beta - The Community Leader')
                .setDescription(
                    `**Meet the visionary behind ${guild.name}!** Prestige Beta is all about creativity and community.\n\n` +
                    `🌟 **Who Are They?** A talented artist, gamer, and leader.\n` +
                    `🎨 **Talents**: Stunning artwork and engaging content creation.\n` +
                    `🏰 **Vision**: Fostering a thriving community of ${guild.memberCount} members.\n` +
                    `📬 **Connect**: Follow their socials below!`
                )
                .addFields(
                    { name: '🎨 Art Style', value: 'Bold, vibrant, and expressive', inline: true },
                    { name: '🎮 Favorites', value: 'Gaming, art, community events', inline: true },
                    { name: '🌍 Community', value: `${guild.name} (${guild.memberCount} members)`, inline: true }
                )
                .setColor('#FF4500')
                .setThumbnail(thumbnailUrl)
                .setImage(bannerUrl)
                .setFooter({ 
                    text: 'Powered by XEN DEVELOPMENT 🌟 Leading with Passion', 
                    iconURL: client.user.displayAvatarURL() 
                })
                .setTimestamp();

            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Facebook')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://www.facebook.com/PrestigeBeta')
                        .setEmoji('📘'),
                    new ButtonBuilder()
                        .setLabel('YouTube')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://www.youtube.com/@prestigebeta6900')
                        .setEmoji('▶️'),
                    new ButtonBuilder()
                        .setLabel('Instagram')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://www.instagram.com/lenarddoesart/')
                        .setEmoji('📸')
                );

            await interaction.reply({ embeds: [ownerEmbed], components: [buttonRow] });
        } catch (error) {
            console.error('Error handling owner command:', error);
            await interaction.reply({
                content: '❌ Couldn’t load owner info. Try again later!',
                ephemeral: true
            });
        }
    }
});

// Event: Bot Ready
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    updatePresence();
    await registerCommands();
});

// Event: Update Member Presence
client.on('presenceUpdate', async () => {
    updatePresence();
});

// Start bot
client.login(TOKEN);