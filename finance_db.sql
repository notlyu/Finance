-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 03, 2026 at 04:37 PM
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
-- Table structure for table `budgets`
--

CREATE TABLE `budgets` (
  `id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `category_id` int(10) UNSIGNED NOT NULL,
  `month` char(7) NOT NULL,
  `type` enum('income','expense') NOT NULL DEFAULT 'expense',
  `limit_amount` decimal(12,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `budgets`
--

INSERT INTO `budgets` (`id`, `family_id`, `user_id`, `category_id`, `month`, `type`, `limit_amount`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 1, '2026-04', 'income', 30000.00, '2026-04-01 06:32:18', '2026-04-01 06:36:57'),
(2, 1, 2, 16, '2026-04', 'expense', 10000.00, '2026-04-03 13:13:55', '2026-04-03 13:13:55'),
(3, 1, 2, 10, '2026-04', 'expense', 5000.00, '2026-04-03 13:14:04', '2026-04-03 13:14:04');

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
(18, 'Другое', 'expense', NULL, NULL, 1, '2026-03-20 16:16:31'),
(19, 'Зарплата', 'income', NULL, NULL, 1, '2026-04-03 14:19:07'),
(20, 'Продукты', 'expense', NULL, NULL, 1, '2026-04-03 14:19:07'),
(21, 'Транспорт', 'expense', NULL, NULL, 1, '2026-04-03 14:19:07'),
(22, 'Другое', 'expense', NULL, NULL, 1, '2026-04-03 14:19:07'),
(23, 'Без категории', 'expense', NULL, NULL, 1, '2026-04-03 14:19:07');

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

--
-- Dumping data for table `families`
--

INSERT INTO `families` (`id`, `name`, `invite_code`, `owner_user_id`, `created_at`) VALUES
(1, 'Тестовая семья', 'TEST123', 2, '2026-03-20 21:12:33');

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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `archived` tinyint(1) DEFAULT 0,
  `archived_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `goals`
--

INSERT INTO `goals` (`id`, `family_id`, `user_id`, `name`, `target_amount`, `target_date`, `interest_rate`, `current_amount`, `auto_contribute_enabled`, `auto_contribute_type`, `auto_contribute_value`, `created_at`, `updated_at`, `archived`, `archived_at`) VALUES
(1, NULL, 2, 'Новый ноутбук', 80000.00, '2026-09-01', 0.00, 43000.00, 1, 'percentage', 20.00, '2026-03-20 21:12:34', '2026-04-03 14:32:37', 0, NULL),
(2, 1, 2, 'Отпуск', 120000.00, '2026-12-01', 5.00, 64150.00, 1, 'percentage', 30.00, '2026-03-20 21:12:34', '2026-04-03 14:32:37', 0, NULL);

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `automatic` tinyint(1) NOT NULL DEFAULT 0,
  `source_transaction_id` int(10) UNSIGNED DEFAULT NULL,
  `type` enum('contribution','interest') NOT NULL DEFAULT 'contribution'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `goal_contributions`
--

INSERT INTO `goal_contributions` (`id`, `goal_id`, `amount`, `date`, `transaction_id`, `created_at`, `automatic`, `source_transaction_id`, `type`) VALUES
(1, 2, 150.00, '2026-03-21', NULL, '2026-03-20 21:42:00', 0, NULL, 'contribution'),
(2, 2, 500.00, '2026-03-21', 7, '2026-03-20 21:48:27', 0, NULL, 'contribution'),
(3, 1, 5000.00, '2026-04-01', 11, '2026-04-01 06:40:05', 0, NULL, 'contribution'),
(4, 1, 1000.00, '2026-04-03', NULL, '2026-04-03 13:04:49', 1, 13, 'contribution'),
(5, 2, 500.00, '2026-04-03', NULL, '2026-04-03 13:04:49', 1, 13, 'contribution'),
(6, 1, 20000.00, '2026-04-03', NULL, '2026-04-03 13:08:12', 1, 14, 'contribution'),
(7, 2, 30000.00, '2026-04-03', NULL, '2026-04-03 13:08:12', 1, 14, 'contribution'),
(8, 1, 1000.00, '2026-04-03', NULL, '2026-04-03 13:39:47', 1, 18, 'contribution'),
(9, 2, 1500.00, '2026-04-03', NULL, '2026-04-03 13:39:47', 1, 18, 'contribution'),
(10, 2, 1200.00, '2026-04-03', NULL, '2026-04-03 14:21:30', 0, NULL, 'contribution'),
(11, 1, 1000.00, '2026-04-03', NULL, '2026-04-03 14:32:37', 1, 26, 'contribution'),
(12, 2, 1500.00, '2026-04-03', NULL, '2026-04-03 14:32:37', 1, 26, 'contribution');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `remind_upcoming` tinyint(1) DEFAULT 1,
  `notify_goal_reached` tinyint(1) DEFAULT 1,
  `notify_budget_exceeded` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recurring_transactions`
--

CREATE TABLE `recurring_transactions` (
  `id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `category_id` int(10) UNSIGNED NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `day_of_month` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `start_month` char(7) NOT NULL,
  `comment` text DEFAULT NULL,
  `is_private` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_run_month` char(7) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `recurring_transactions`
--

INSERT INTO `recurring_transactions` (`id`, `family_id`, `user_id`, `category_id`, `amount`, `type`, `day_of_month`, `start_month`, `comment`, `is_private`, `active`, `last_run_month`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 2, 90000.00, 'income', 1, '2026-04', NULL, 0, 0, NULL, '2026-04-01 06:32:54', '2026-04-03 12:43:01');

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

--
-- Dumping data for table `safety_pillow_history`
--

INSERT INTO `safety_pillow_history` (`id`, `user_id`, `value`, `target_value`, `calculated_at`) VALUES
(1, 2, 78150.00, 8000.00, '2026-03-20 21:42:00'),
(2, 2, 76650.00, 8000.00, '2026-03-20 21:45:07'),
(3, 2, 82150.00, 8000.00, '2026-03-20 21:48:27'),
(4, 2, 32150.00, 58000.00, '2026-03-21 08:34:50'),
(5, 2, 132150.00, 8000.00, '2026-03-21 08:34:55'),
(6, 2, 128150.00, 12000.00, '2026-03-21 08:35:26'),
(7, 2, 179650.00, 17000.00, '2026-04-03 13:04:49'),
(8, 2, 309650.00, 17000.00, '2026-04-03 13:08:12'),
(9, 2, 304650.00, 28000.00, '2026-04-03 13:14:27'),
(10, 2, 311150.00, 28000.00, '2026-04-03 13:39:47'),
(12, 2, 317650.00, 30000.00, '2026-04-03 14:32:37');

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

--
-- Dumping data for table `safety_pillow_settings`
--

INSERT INTO `safety_pillow_settings` (`id`, `user_id`, `months`, `updated_at`) VALUES
(1, 2, 3, '2026-03-20 21:12:34'),
(2, 1, 3, '2026-03-26 18:25:23'),
(4, 3, 3, '2026-03-30 14:39:46');

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

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `user_id`, `family_id`, `amount`, `type`, `category_id`, `date`, `comment`, `is_private`, `created_at`) VALUES
(1, 2, 1, 50000.00, 'income', 1, '2026-03-21', 'Зарплата', 0, '2026-03-20 21:12:33'),
(2, 2, 1, 3500.00, 'expense', 7, '2026-03-20', 'Продукты на неделю', 0, '2026-03-20 21:12:33'),
(3, 2, 1, 800.00, 'expense', 9, '2026-03-19', 'Проездной', 0, '2026-03-20 21:12:33'),
(4, 2, 1, 2500.00, 'expense', 18, '2026-03-18', 'Подарок другу', 1, '2026-03-20 21:12:33'),
(5, 2, 1, 1200.00, 'expense', 7, '2026-03-14', 'Кафе', 0, '2026-03-20 21:12:33'),
(7, 2, 1, 5000.00, 'income', 1, '2026-03-21', NULL, 0, '2026-03-20 21:48:27'),
(8, 2, 1, 50000.00, 'income', 1, '2026-02-02', '', 0, '2026-03-21 08:34:50'),
(9, 2, 1, 4000.00, 'expense', 4, '2026-02-12', NULL, 0, '2026-03-21 08:35:26'),
(10, 2, 1, 30000.00, 'income', 1, '2026-04-01', '', 0, '2026-04-01 06:37:19'),
(11, 2, 1, 5000.00, 'expense', 16, '2026-04-01', 'Пополнение цели: Новый ноутбук', 0, '2026-04-01 06:40:05'),
(12, 2, 1, 20000.00, 'income', 1, '2026-04-03', '', 0, '2026-04-03 12:38:50'),
(13, 2, 1, 5000.00, 'income', 5, '2026-04-03', '', 0, '2026-04-03 13:04:49'),
(14, 2, 1, 100000.00, 'income', 1, '2026-04-03', '', 0, '2026-04-03 13:08:11'),
(15, 2, 1, 5000.00, 'expense', 15, '2026-04-03', 'Пополнение желания: Наушники', 0, '2026-04-03 13:09:46'),
(16, 2, 1, 1000.00, 'expense', 15, '2026-04-03', 'Пополнение желания: Наушники', 0, '2026-04-03 13:10:26'),
(17, 2, 1, 5000.00, 'expense', 10, '2026-04-03', '', 0, '2026-04-03 13:14:27'),
(18, 2, 1, 5000.00, 'income', 1, '2026-04-03', '', 0, '2026-04-03 13:39:46'),
(19, 2, 1, 2000.00, 'expense', 15, '2026-04-03', 'Пополнение желания: Наушники', 0, '2026-04-03 13:50:28'),
(26, 2, 1, 5000.00, 'income', 1, '2026-04-03', '', 0, '2026-04-03 14:32:37');

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

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `name`, `family_id`, `created_at`) VALUES
(1, 'sfivfiv@yandex.ru', '$2b$10$AF9TIlzLZQNHxJ7mLaR10.LieLbnm/iTTtrWjITWwrYpB2mxLoRG.', 'Ly', NULL, '2026-03-20 20:35:56'),
(2, 'test@example.com', '$2b$10$f.6BBCgJ58qbww6/eF2JnOyTQ/JeSmpTEt5fSyhBjzeFJtx8ZBUyu', 'Тестовый пользователь', 1, '2026-03-20 21:12:33'),
(3, 'test@mail.ru', '$2b$10$u4wbC3fMgcnbyT.NUZuDnepXmt2vMgABsPXMY71apqtX/4Mav0d1W', 'LU', NULL, '2026-03-30 14:39:40');

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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `archived` tinyint(1) DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `category_id` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `wishes`
--

INSERT INTO `wishes` (`id`, `user_id`, `family_id`, `name`, `cost`, `priority`, `status`, `saved_amount`, `is_private`, `created_at`, `updated_at`, `archived`, `archived_at`, `category_id`) VALUES
(1, 2, 1, 'Наушники', 12000.00, 1, 'active', 12000.00, 0, '2026-03-20 21:12:34', '2026-04-03 13:50:28', 0, NULL, NULL),
(2, 2, 1, 'Сюрприз для партнёра', 5000.00, 2, 'active', 0.00, 1, '2026-03-20 21:12:34', '2026-03-20 21:12:34', 0, NULL, NULL),
(3, 2, 1, 'Книга', 1500.00, 5, 'completed', 1500.00, 0, '2026-03-20 21:12:34', '2026-04-03 13:16:53', 0, NULL, NULL);

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
-- Dumping data for table `wish_contributions`
--

INSERT INTO `wish_contributions` (`id`, `wish_id`, `amount`, `date`, `transaction_id`, `created_at`) VALUES
(1, 1, 5000.00, '2026-04-03', 15, '2026-04-03 13:09:46'),
(2, 1, 1000.00, '2026-04-03', 16, '2026-04-03 13:10:26'),
(3, 1, 2000.00, '2026-04-03', 19, '2026-04-03 13:50:28');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `budgets`
--
ALTER TABLE `budgets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_budgets_family_month` (`family_id`,`month`),
  ADD KEY `idx_budgets_user_month` (`user_id`,`month`),
  ADD KEY `idx_budgets_category` (`category_id`);

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
  ADD KEY `fk_goal_contributions_transaction_id_idx` (`transaction_id`),
  ADD KEY `idx_goal_contrib_source_tx` (`source_transaction_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `recurring_transactions`
--
ALTER TABLE `recurring_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_recurring_family_active` (`family_id`,`active`),
  ADD KEY `idx_recurring_last_run` (`last_run_month`),
  ADD KEY `idx_recurring_start_month` (`start_month`),
  ADD KEY `idx_recurring_category` (`category_id`),
  ADD KEY `idx_recurring_user` (`user_id`);

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
  ADD KEY `transactions_type` (`type`),
  ADD KEY `idx_transactions_family_date_type` (`family_id`,`date`,`type`),
  ADD KEY `idx_transactions_user` (`user_id`),
  ADD KEY `idx_transactions_family_id` (`family_id`);

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
  ADD KEY `wishes_status` (`status`),
  ADD KEY `idx_wishes_category` (`category_id`);

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
-- AUTO_INCREMENT for table `budgets`
--
ALTER TABLE `budgets`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `families`
--
ALTER TABLE `families`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `family_invites`
--
ALTER TABLE `family_invites`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `goals`
--
ALTER TABLE `goals`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `goal_contributions`
--
ALTER TABLE `goal_contributions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `recurring_transactions`
--
ALTER TABLE `recurring_transactions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `safety_pillow_history`
--
ALTER TABLE `safety_pillow_history`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `safety_pillow_settings`
--
ALTER TABLE `safety_pillow_settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `wishes`
--
ALTER TABLE `wishes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `wish_contributions`
--
ALTER TABLE `wish_contributions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `budgets`
--
ALTER TABLE `budgets`
  ADD CONSTRAINT `fk_budgets_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_budgets_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_budgets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_goal_contributions_source_transaction` FOREIGN KEY (`source_transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_goal_contributions_transaction_id` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `recurring_transactions`
--
ALTER TABLE `recurring_transactions`
  ADD CONSTRAINT `fk_recurring_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_recurring_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_recurring_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_wishes_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
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
