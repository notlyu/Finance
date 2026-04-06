-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 05, 2026 at 07:05 PM
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
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_personal` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `budgets`
--

INSERT INTO `budgets` (`id`, `family_id`, `user_id`, `category_id`, `month`, `type`, `limit_amount`, `created_at`, `updated_at`, `is_personal`) VALUES
(1, 1, 2, 1, '2026-04', 'income', 30000.00, '2026-04-01 06:32:18', '2026-04-01 06:36:57', 0),
(2, 1, 2, 16, '2026-04', 'expense', 40000.00, '2026-04-03 13:13:55', '2026-04-03 21:03:52', 0),
(3, 1, 2, 10, '2026-04', 'expense', 5000.00, '2026-04-03 13:14:04', '2026-04-03 13:14:04', 0);

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
(23, 'Без категории', 'expense', NULL, NULL, 1, '2026-04-03 14:19:07'),
(32, 'Пополнение целей', 'expense', 1, NULL, 0, '2026-04-04 18:36:33'),
(33, 'Выделение средств на желания', 'expense', 1, NULL, 0, '2026-04-05 09:11:19'),
(34, 'Зарплата', 'income', NULL, 1, 0, '2026-04-05 09:47:43');

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
(1, 'Тестовая семья', 'TEST123', 2, '2026-03-20 21:12:33'),
(4, 'Test Family', 'TEST', 5, '2026-04-03 20:43:34'),
(6, 'Test Family 1775249073242', 'T1775249073242', 7, '2026-04-03 20:44:33'),
(7, 'Test Family 1775249116494', 'T1775249116494', 8, '2026-04-03 20:45:16'),
(8, 'Test Family 1775249438691', 'T1775249438691', 9, '2026-04-03 20:50:38');

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
(6, NULL, 7, 'Test Goal', 100000.00, NULL, NULL, 0.00, 1, 'percentage', 10.00, '2026-04-03 20:44:33', '2026-04-03 20:44:33', 0, NULL),
(7, NULL, 8, 'Test Goal', 100000.00, NULL, NULL, 0.00, 1, 'percentage', 10.00, '2026-04-03 20:45:17', '2026-04-03 20:45:17', 0, NULL),
(8, NULL, 9, 'Test Goal', 100000.00, NULL, NULL, 0.00, 1, 'percentage', 10.00, '2026-04-03 20:50:39', '2026-04-03 20:50:39', 0, NULL),
(9, 1, 2, 'Отпуск', 300000.00, '2026-04-04', 12.00, 300000.00, 1, 'percentage', 25.00, '2026-04-04 17:13:24', '2026-04-04 18:36:33', 1, '2026-04-04 18:36:33'),
(10, NULL, 2, 'еда', 5000.00, '2026-04-04', NULL, 5000.00, 0, 'percentage', NULL, '2026-04-04 18:33:03', '2026-04-04 18:33:03', 1, '2026-04-04 18:33:03'),
(11, NULL, 2, 'Отпуск 2', 500000.00, '2026-04-05', NULL, 5000.00, 0, 'percentage', NULL, '2026-04-05 09:44:54', '2026-04-05 09:45:32', 0, NULL);

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
(19, 9, 75000.00, '2026-04-04', 46, '2026-04-04 17:14:43', 0, NULL, 'contribution'),
(20, 9, 70000.00, '2026-04-04', 47, '2026-04-04 17:15:15', 0, NULL, 'contribution'),
(21, 9, 155000.00, '2026-04-04', 48, '2026-04-04 18:36:33', 0, NULL, 'contribution'),
(22, 11, 5000.00, '2026-04-05', 54, '2026-04-05 09:45:32', 0, NULL, 'contribution');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `type` enum('goal_reached','wish_completed','budget_exceeded','recurring_created','pillow_alert','info') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `related_id` int(10) UNSIGNED DEFAULT NULL,
  `related_type` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `is_read`, `related_id`, `related_type`, `created_at`) VALUES
(1, 2, 'goal_reached', '🎉 Цель достигнута!', 'Поздравляем! Вы накопили на цель \"Отпуск\" — 300000.00 ₽ из 300000.00 ₽', 1, 9, 'goal', '2026-04-04 18:36:33');

-- --------------------------------------------------------

--
-- Table structure for table `notification_settings`
--

CREATE TABLE `notification_settings` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `remind_upcoming` tinyint(1) DEFAULT 1,
  `notify_goal_reached` tinyint(1) DEFAULT 1,
  `notify_budget_exceeded` tinyint(1) DEFAULT 1,
  `notify_wish_completed` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_settings`
--

INSERT INTO `notification_settings` (`id`, `user_id`, `remind_upcoming`, `notify_goal_reached`, `notify_budget_exceeded`, `notify_wish_completed`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 1, 1, 1, '2026-04-03 19:42:18', '2026-04-03 19:42:18'),
(2, 2, 1, 1, 1, 1, '2026-04-03 19:42:18', '2026-04-03 19:42:18'),
(3, 5, 1, 1, 1, 1, '2026-04-03 20:43:35', '2026-04-03 20:43:35'),
(4, 7, 1, 1, 1, 1, '2026-04-03 20:44:33', '2026-04-03 20:44:33'),
(5, 8, 1, 1, 1, 1, '2026-04-03 20:45:17', '2026-04-03 20:45:17'),
(6, 9, 1, 1, 1, 1, '2026-04-03 20:50:39', '2026-04-03 20:50:39'),
(7, 1, 1, 1, 1, 1, '2026-04-05 09:06:42', '2026-04-05 09:06:42'),
(8, 1, 1, 1, 1, 1, '2026-04-05 09:06:42', '2026-04-05 09:06:42');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `token` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recurring_transactions`
--

CREATE TABLE `recurring_transactions` (
  `id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
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
(1, 1, 2, 2, 90000.00, 'income', 1, '2026-04', NULL, 0, 1, NULL, '2026-04-01 06:32:54', '2026-04-04 17:56:05');

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
(12, 2, 317650.00, 30000.00, '2026-04-03 14:32:37'),
(13, 2, 447650.00, 30000.00, '2026-04-03 14:41:42'),
(14, 2, 217650.00, 130000.00, '2026-04-03 14:53:31'),
(15, 5, 50000.00, 0.00, '2026-04-03 20:43:34'),
(16, 7, 50000.00, 0.00, '2026-04-03 20:44:33'),
(17, 8, 50000.00, 0.00, '2026-04-03 20:45:16'),
(18, 9, 50000.00, 0.00, '2026-04-03 20:50:39'),
(19, 2, 523500.00, 0.00, '2026-04-03 20:51:05'),
(20, 2, 173500.00, 583333.33, '2026-04-03 20:54:05'),
(21, 2, 110000.00, 260000.00, '2026-04-03 21:03:26'),
(22, 2, 110000.00, 260000.00, '2026-04-03 21:04:04'),
(23, 2, 1610000.00, 260000.00, '2026-04-03 21:04:29'),
(24, 1, 1335000.00, 1430000.00, '2026-04-05 09:11:57');

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
(1, 2, 2, '2026-04-04 17:27:46'),
(2, 1, 6, '2026-04-05 09:08:17'),
(4, 3, 3, '2026-03-30 14:39:46');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
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
(41, 2, 1, 500000.00, 'income', 1, '2026-04-03', '', 0, '2026-04-03 20:51:05'),
(42, 2, 1, 350000.00, 'expense', 3, '2026-04-03', '', 0, '2026-04-03 20:54:05'),
(44, 2, 1, 40000.00, 'expense', 16, '2026-04-03', '', 0, '2026-04-03 21:04:04'),
(45, 2, 1, 1500000.00, 'income', 1, '2026-04-03', '', 0, '2026-04-03 21:04:29'),
(46, 2, 1, 75000.00, 'expense', 14, '2026-04-04', 'Пополнение цели: Отпуск', 0, '2026-04-04 17:14:43'),
(47, 2, 1, 70000.00, 'expense', 14, '2026-04-04', 'Пополнение цели: Отпуск', 0, '2026-04-04 17:15:15'),
(48, 2, 1, 155000.00, 'expense', 32, '2026-04-04', 'Пополнение цели: Отпуск', 0, '2026-04-04 18:36:33'),
(49, 1, 1, 25000.00, 'expense', 33, '2026-04-05', 'Пополнение желания: бургер', 0, '2026-04-05 09:11:19'),
(50, 1, 1, 50000.00, 'income', 1, '2026-04-05', '', 0, '2026-04-05 09:11:57'),
(51, 1, 1, 25000.00, 'expense', 33, '2026-04-05', 'Пополнение желания: бургер', 0, '2026-04-05 09:12:57'),
(52, 1, 1, 100000.00, 'expense', 33, '2026-04-05', 'Пополнение желания: дом', 0, '2026-04-05 09:18:52'),
(53, 1, 1, 3000000.00, 'expense', 33, '2026-04-05', 'Пополнение желания: дача', 0, '2026-04-05 09:20:00'),
(54, 2, 1, 5000.00, 'expense', 32, '2026-04-05', 'Пополнение цели: Отпуск 2', 0, '2026-04-05 09:45:32');

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
(3, 'test@mail.ru', '$2b$10$u4wbC3fMgcnbyT.NUZuDnepXmt2vMgABsPXMY71apqtX/4Mav0d1W', 'LU', NULL, '2026-03-30 14:39:40'),
(5, 'test_1775249013915@example.com', '$2b$10$rS1H5xqE8pV2Z3kL4mN6OeW7yX8zA9bC0dE1fG2hI3jK4lM5nO6pQ', 'Test User', 4, '2026-04-03 20:43:33'),
(6, 'test_1775249053311@example.com', '$2b$10$rS1H5xqE8pV2Z3kL4mN6OeW7yX8zA9bC0dE1fG2hI3jK4lM5nO6pQ', 'Test User', NULL, '2026-04-03 20:44:13'),
(7, 'test_1775249073108@example.com', '$2b$10$rS1H5xqE8pV2Z3kL4mN6OeW7yX8zA9bC0dE1fG2hI3jK4lM5nO6pQ', 'Test User', 6, '2026-04-03 20:44:33'),
(8, 'test_1775249116378@example.com', '$2b$10$rS1H5xqE8pV2Z3kL4mN6OeW7yX8zA9bC0dE1fG2hI3jK4lM5nO6pQ', 'Test User', 7, '2026-04-03 20:45:16'),
(9, 'test_1775249438403@example.com', '$2b$10$rS1H5xqE8pV2Z3kL4mN6OeW7yX8zA9bC0dE1fG2hI3jK4lM5nO6pQ', 'Test User', 8, '2026-04-03 20:50:38');

-- --------------------------------------------------------

--
-- Table structure for table `wishes`
--

CREATE TABLE `wishes` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `cost` decimal(12,2) NOT NULL,
  `priority` tinyint(3) UNSIGNED NOT NULL DEFAULT 3,
  `status` enum('active','completed','postponed') NOT NULL DEFAULT 'active',
  `saved_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `is_private` tinyint(1) DEFAULT 1,
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
(1, 2, 1, 'Наушники', 12000.00, 1, 'active', 12000.00, 0, '2026-04-03 00:00:00', '2026-04-03 19:06:03', 0, NULL, NULL),
(2, 2, 1, 'Сюрприз для партнёра', 5000.00, 2, 'active', 5000.00, 1, '2026-03-20 21:12:34', '2026-04-03 19:06:07', 0, '2026-04-03 19:05:58', NULL),
(3, 2, 1, 'Книга', 1500.00, 5, 'completed', 1500.00, 0, '2026-03-20 21:12:34', '2026-04-03 13:16:53', 0, NULL, NULL),
(6, 2, 1, 'скейт', 5000.00, 3, 'completed', 5000.00, 0, '2026-04-03 20:02:00', '2026-04-03 20:02:06', 1, '2026-04-03 20:02:06', 14),
(7, 7, 6, 'Test Wish', 15000.00, 2, 'active', 0.00, 0, '2026-04-03 20:44:33', '2026-04-03 20:44:33', 0, NULL, NULL),
(8, 8, 7, 'Test Wish', 15000.00, 2, 'active', 0.00, 0, '2026-04-03 20:45:17', '2026-04-03 20:45:17', 0, NULL, NULL),
(9, 9, 8, 'Test Wish', 15000.00, 2, 'active', 0.00, 0, '2026-04-03 20:50:39', '2026-04-03 20:50:39', 0, NULL, NULL),
(10, 2, 1, 'бургер', 50000.00, 1, 'completed', 50000.00, 0, '2026-04-03 20:52:26', '2026-04-05 09:12:57', 1, '2026-04-05 09:12:57', 7),
(11, 1, 1, 'дом', 100000.00, 2, 'completed', 100000.00, 0, '2026-04-05 09:18:22', '2026-04-05 09:18:52', 1, '2026-04-05 09:18:52', 16),
(12, 1, 1, 'квартира', 500000.00, 2, 'active', 0.00, 0, '2026-04-05 09:19:11', '2026-04-05 09:19:11', 0, NULL, 16),
(13, 1, 1, 'дача', 3000000.00, 2, 'completed', 3000000.00, 0, '2026-04-05 09:19:50', '2026-04-05 09:20:00', 1, '2026-04-05 09:20:00', 16);

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
(1, 1, 5000.00, '2026-04-03', NULL, '2026-04-03 13:09:46'),
(2, 1, 1000.00, '2026-04-03', NULL, '2026-04-03 13:10:26'),
(3, 1, 2000.00, '2026-04-03', NULL, '2026-04-03 13:50:28'),
(4, 2, 1250.00, '2026-04-03', NULL, '2026-04-03 19:03:18'),
(5, 2, 2812.50, '2026-04-03', NULL, '2026-04-03 19:03:23'),
(6, 2, 937.50, '2026-04-03', NULL, '2026-04-03 19:05:57'),
(7, 6, 5000.00, '2026-04-03', NULL, '2026-04-03 20:02:06'),
(8, 10, 25000.00, '2026-04-05', 49, '2026-04-05 09:11:19'),
(9, 10, 25000.00, '2026-04-05', 51, '2026-04-05 09:12:57'),
(10, 11, 100000.00, '2026-04-05', 52, '2026-04-05 09:18:52'),
(11, 13, 3000000.00, '2026-04-05', 53, '2026-04-05 09:20:00');

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
  ADD KEY `idx_notifications_user_read` (`user_id`,`is_read`),
  ADD KEY `idx_notifications_created` (`created_at`);

--
-- Indexes for table `notification_settings`
--
ALTER TABLE `notification_settings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_user_id` (`user_id`);

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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `families`
--
ALTER TABLE `families`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `family_invites`
--
ALTER TABLE `family_invites`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `goals`
--
ALTER TABLE `goals`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `goal_contributions`
--
ALTER TABLE `goal_contributions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notification_settings`
--
ALTER TABLE `notification_settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `recurring_transactions`
--
ALTER TABLE `recurring_transactions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `safety_pillow_history`
--
ALTER TABLE `safety_pillow_history`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `safety_pillow_settings`
--
ALTER TABLE `safety_pillow_settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `wishes`
--
ALTER TABLE `wishes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `wish_contributions`
--
ALTER TABLE `wish_contributions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

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
-- Constraints for table `notification_settings`
--
ALTER TABLE `notification_settings`
  ADD CONSTRAINT `notification_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

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
