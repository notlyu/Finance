-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 20, 2026 at 05:43 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `finance_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `type`, `family_id`, `user_id`, `is_system`, `created_at`) VALUES
(1, 'Зарплата', 'income', NULL, NULL, 1, '2026-03-20 16:16:31'),
(2, 'Фриланс', 'income', NULL, NULL, 1, '2026-03-20 16:16:31'),
(3, 'Подарки', 'income', NULL, NULL, 1, '2026-03-20 16:16:31'),
(4, 'Возврат долга', 'income', NULL, NULL, 1, '2026-03-20 16:16:31'),
(5, 'Проценты по вкладам', 'income', NULL, NULL, 1, '2026-03-20 16:16:31'),
(6, 'Другое', 'income', NULL, NULL, 1, '2026-03-20 16:16:31'),
(7, 'Продукты', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(8, 'Коммунальные услуги', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(9, 'Транспорт', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(10, 'Кафе и рестораны', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(11, 'Одежда', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(12, 'Здоровье', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(13, 'Образование', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(14, 'Развлечения', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(15, 'Подарки', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(16, 'Дом и ремонт', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(17, 'Связь и интернет', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(18, 'Другое', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31');

-- --------------------------------------------------------

--
-- Table structure for table `families`
--

CREATE TABLE `families` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `invite_code` varchar(20) NOT NULL,
  `owner_user_id` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `family_invites`
--

CREATE TABLE `family_invites` (
  `id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED NOT NULL,
  `code` varchar(20) NOT NULL,
  `created_by` int(10) UNSIGNED NOT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `goals`
--

CREATE TABLE `goals` (
  `id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `target_amount` decimal(12,2) NOT NULL,
  `target_date` date DEFAULT NULL,
  `interest_rate` decimal(5,2) DEFAULT NULL,
  `current_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `auto_contribute_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `auto_contribute_type` enum('percentage','fixed') DEFAULT NULL,
  `auto_contribute_value` decimal(12,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `goal_contributions`
--

CREATE TABLE `goal_contributions` (
  `id` int(10) UNSIGNED NOT NULL,
  `goal_id` int(10) UNSIGNED NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `date` date NOT NULL,
  `transaction_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `safety_pillow_history`
--

CREATE TABLE `safety_pillow_history` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `value` decimal(12,2) NOT NULL,
  `target_value` decimal(12,2) NOT NULL,
  `calculated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `safety_pillow_settings`
--

CREATE TABLE `safety_pillow_settings` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `months` tinyint(3) UNSIGNED NOT NULL DEFAULT 3,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `category_id` int(10) UNSIGNED NOT NULL,
  `date` date NOT NULL,
  `comment` text DEFAULT NULL,
  `is_private` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `wishes`
--

CREATE TABLE `wishes` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `cost` decimal(12,2) NOT NULL,
  `priority` tinyint(3) UNSIGNED NOT NULL DEFAULT 3,
  `status` enum('active','completed','postponed') NOT NULL DEFAULT 'active',
  `saved_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `is_private` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `wish_contributions`
--

CREATE TABLE `wish_contributions` (
  `id` int(10) UNSIGNED NOT NULL,
  `wish_id` int(10) UNSIGNED NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `date` date NOT NULL,
  `transaction_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_categories_family_id_idx` (`family_id`),
  ADD KEY `fk_categories_user_id_idx` (`user_id`),
  ADD KEY `categories_type` (`type`);

--
-- Indexes for table `families`
--
ALTER TABLE `families`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invite_code_UNIQUE` (`invite_code`),
  ADD KEY `fk_families_owner_user_id_idx` (`owner_user_id`);

--
-- Indexes for table `family_invites`
--
ALTER TABLE `family_invites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code_UNIQUE` (`code`),
  ADD KEY `fk_family_invites_family_id_idx` (`family_id`),
  ADD KEY `fk_family_invites_created_by_idx` (`created_by`);

--
-- Indexes for table `goals`
--
ALTER TABLE `goals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_goals_family_id_idx` (`family_id`),
  ADD KEY `fk_goals_user_id_idx` (`user_id`);

--
-- Indexes for table `goal_contributions`
--
ALTER TABLE `goal_contributions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_goal_contributions_goal_id_idx` (`goal_id`),
  ADD KEY `fk_goal_contributions_transaction_id_idx` (`transaction_id`);

--
-- Indexes for table `safety_pillow_history`
--
ALTER TABLE `safety_pillow_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_safety_pillow_history_user_id_idx` (`user_id`),
  ADD KEY `safety_pillow_history_calculated_at` (`calculated_at`);

--
-- Indexes for table `safety_pillow_settings`
--
ALTER TABLE `safety_pillow_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id_UNIQUE` (`user_id`),
  ADD KEY `fk_safety_pillow_settings_user_id_idx` (`user_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_transactions_user_id_idx` (`user_id`),
  ADD KEY `fk_transactions_family_id_idx` (`family_id`),
  ADD KEY `fk_transactions_category_id_idx` (`category_id`),
  ADD KEY `transactions_date` (`date`),
  ADD KEY `transactions_type` (`type`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email_UNIQUE` (`email`),
  ADD KEY `fk_users_family_id_idx` (`family_id`);

--
-- Indexes for table `wishes`
--
ALTER TABLE `wishes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_wishes_user_id_idx` (`user_id`),
  ADD KEY `fk_wishes_family_id_idx` (`family_id`),
  ADD KEY `wishes_status` (`status`);

--
-- Indexes for table `wish_contributions`
--
ALTER TABLE `wish_contributions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_wish_contributions_wish_id_idx` (`wish_id`),
  ADD KEY `fk_wish_contributions_transaction_id_idx` (`transaction_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `families`
--
ALTER TABLE `families`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `family_invites`
--
ALTER TABLE `family_invites`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `goals`
--
ALTER TABLE `goals`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `goal_contributions`
--
ALTER TABLE `goal_contributions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `safety_pillow_history`
--
ALTER TABLE `safety_pillow_history`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `safety_pillow_settings`
--
ALTER TABLE `safety_pillow_settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `wishes`
--
ALTER TABLE `wishes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `wish_contributions`
--
ALTER TABLE `wish_contributions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `fk_categories_family_id` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_categories_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `families`
--
ALTER TABLE `families`
  ADD CONSTRAINT `fk_families_owner_user_id` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `family_invites`
--
ALTER TABLE `family_invites`
  ADD CONSTRAINT `fk_family_invites_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_family_invites_family_id` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `goals`
--
ALTER TABLE `goals`
  ADD CONSTRAINT `fk_goals_family_id` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_goals_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `goal_contributions`
--
ALTER TABLE `goal_contributions`
  ADD CONSTRAINT `fk_goal_contributions_goal_id` FOREIGN KEY (`goal_id`) REFERENCES `goals` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_goal_contributions_transaction_id` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `safety_pillow_history`
--
ALTER TABLE `safety_pillow_history`
  ADD CONSTRAINT `fk_safety_pillow_history_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `safety_pillow_settings`
--
ALTER TABLE `safety_pillow_settings`
  ADD CONSTRAINT `fk_safety_pillow_settings_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `fk_transactions_family_id` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_transactions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_family_id` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `wishes`
--
ALTER TABLE `wishes`
  ADD CONSTRAINT `fk_wishes_family_id` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_wishes_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `wish_contributions`
--
ALTER TABLE `wish_contributions`
  ADD CONSTRAINT `fk_wish_contributions_transaction_id` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_wish_contributions_wish_id` FOREIGN KEY (`wish_id`) REFERENCES `wishes` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
