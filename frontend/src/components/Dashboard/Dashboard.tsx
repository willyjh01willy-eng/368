import React, { useState, useEffect } from 'react';
import { Users, FolderOpen, CheckSquare, TrendingUp, Calendar } from 'lucide-react';
import MetricCard from './MetricCard';
import ProgressChart from './ProgressChart';
import ProjectStatusChart from './ProjectStatusChart';
import DepartmentChart from './DepartmentChart';
import RecentActivity from './RecentActivity';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import { internService } from '../../services/internService';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { useApiError } from '../../hooks/useApiError';
import { encadreurService } from '../../services/encadreurService';

export default function Dashboard() {
  const { authUser } = useAuth();
  const { handleApiError } = useApiError();

  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    totalInterns: 0,
    activeProjects: 0,
    completedTasks: 0,
    successRate: 0,
    daysRemaining: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, [authUser]);

  const loadDashboardData = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      const userId = authUser.profile.userID;

      if (authUser.role === 'ADMIN') {
        const [interns, projects, tasks] = await Promise.all([
          internService.getAllInterns(),
          projectService.getAllProjects(),
          taskService.getAllTasks()
        ]);

        const activeProjects = projects.filter(p => p.status === 'PLANNING').length;
        const completedTasks = tasks.filter(t => t.status === 'DONE').length;
        const completedProjects = projects.filter(p => p.status === 'COMPLETED').length;
        const successRate = projects.length > 0 ? (completedProjects * 100.0 / projects.length) : 0;

        setMetrics({
          totalInterns: interns.length,
          activeProjects,
          completedTasks,
          successRate,
          daysRemaining: 0,
        });

      } else if (authUser.role === 'ENCADREUR') {
        const dataa = await encadreurService.getEncadreurById(
                  userId
          );

        const [interns, projects, allTasks] = await Promise.all([
          internService.getAllInterns({ encadreurId: dataa.encadreurId }),
          projectService.getAllProjects({ encadreurId: dataa.encadreurId }),
          taskService.getAllTasks()
        ]);

      

        const internIds = interns.map(i => i.userId);
        const ProjectIDS = projects.map(i => i.id);



        
        const tasksForMyInterns = allTasks.filter(t => ProjectIDS.includes(t.projectId));
        const completedTasks = tasksForMyInterns.filter(t => t.status === 'DONE').length;
        const activeProjects = projects.filter(p => p.status === 'PLANNING').length;
        const completedProjects = projects.filter(p => p.status === 'COMPLETED').length;
        const successRate = projects.length > 0 ? (completedProjects * 100.0 / projects.length) : 0;

        setMetrics({
          totalInterns: interns.length,
          activeProjects,
          completedTasks,
          successRate,
          daysRemaining: 0,
        });

      } else if (authUser.role === 'STAGIAIRE') {

        const [internData, projects, tasks] = await Promise.all([
          internService.getAllInterns(),
          projectService.getAllProjects(),
          taskService.getAllTasks({ userId })
        ]);


        const currentIntern = internData.find(i => i.userId === userId);
        
        const userIdString = currentIntern?.userId?.toString() ?? '';

        const myProjects = projects.filter(p => String(p.stagiaireId) === userIdString);
        let daysRemaining = 0;
        if (currentIntern?.endDate) {
          const endDate = new Date(currentIntern.endDate);
          const today = new Date();
          const diffTime = endDate.getTime() - today.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }

        const completedTasks = tasks.filter(t => t.status === 'DONE').length;
        const activeProjects = myProjects.filter(p => p.status === 'PLANNING').length;
        const avgProgress = myProjects.length > 0
          ? myProjects.reduce((sum, p) => sum + p.progress, 0) / myProjects.length
          : 0;

        setMetrics({
          totalInterns: myProjects.length,
          activeProjects,
          completedTasks,
          successRate: avgProgress,
          daysRemaining,
        });
      }
    } catch (error: any) {
      handleApiError(error, 'Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Message de bienvenue
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? 'Bonjour'
      : currentHour < 18
      ? 'Bon après-midi'
      : 'Bonsoir';
  const userRole = authUser?.role || 'STAGIAIRE';
  const userName = authUser
    ? `${authUser.profile.firstName} ${authUser.profile.lastName}`
    : 'Utilisateur';

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Responsable RH';
      case 'ENCADREUR':
        return 'Encadreur';
      case 'STAGIAIRE':
        return 'Stagiaire';
      default:
        return 'Utilisateur';
    }
  };

  // Loader
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Rendu principal
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-sm p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              {greeting}, {userName}
            </h2>
            <p className="text-orange-50 text-sm md:text-base">
              {userRole === 'ADMIN' &&
                "Bienvenue sur votre tableau de bord. Voici un aperçu de vos activités aujourd'hui."}
              {userRole === 'ENCADREUR' &&
                'Gérez vos stagiaires et suivez leurs progressions.'}
              {userRole === 'STAGIAIRE' &&
                'Consultez vos projets et suivez vos progressions.'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 text-center">
              <p className="text-xs md:text-sm text-orange-100 mb-1">
                Aujourd'hui
              </p>
              <p className="text-xl md:text-2xl font-bold">
                {new Date().toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cartes de métriques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {authUser?.role === 'STAGIAIRE' ? (
          <MetricCard
            title="Jours Restants"
            value={metrics.daysRemaining}
            icon={Calendar}
            color="bg-blue-500"
            trend={{ value: 0, isPositive: false }}
          />
        ) : (
          <MetricCard
            title={authUser?.role === 'ADMIN' ? 'Total Stagiaires' : 'Mes Stagiaires'}
            value={metrics.totalInterns}
            icon={Users}
            color="bg-blue-500"
            trend={{ value: 0, isPositive: true }}
          />
        )}
        <MetricCard
          title={authUser?.role === 'STAGIAIRE' ? 'Mon Projet' : 'Projets Actifs'}
          value={metrics.activeProjects}
          icon={FolderOpen}
          color="bg-green-500"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Tâches Terminées"
          value={metrics.completedTasks}
          icon={CheckSquare}
          color="bg-red-500"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title={authUser?.role === 'STAGIAIRE' ? 'Progression Moyenne' : 'Taux de Réussite'}
          value={`${Math.round(metrics.successRate)}%`}
          icon={TrendingUp}
          color="bg-orange-500"
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgressChart />
        <ProjectStatusChart />
      </div>

      {/* Diagramme et activité récente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DepartmentChart />
        </div>
        <RecentActivity />
      </div>
    </div>
  );
}
