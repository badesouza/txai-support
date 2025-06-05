const Home = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Cards do Dashboard */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Total de Usuários</h2>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-500">0</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Chamados Abertos</h2>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-500">0</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Chamados em Andamento</h2>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-500">0</p>
            </div>
        </div>
    );
};

export default Home; 