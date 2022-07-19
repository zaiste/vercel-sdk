interface Env {
  key: string
  value: string
  target?: string[]
  type?: string
}

export const Vercel = (accessToken: string, projectId: string, teamId: string | null | undefined = null) => {
  const _client = async (method: string = "GET", path: string, body: unknown = undefined) => {
    const dest = `https://api.vercel.com${path}` + (teamId ? `?teamId=${teamId}` : "")

    try {
      const r = await fetch(dest,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        }
      )

      const result = await r.json();
      return result;
    } catch (error) {
      console.error(error)
    }

  }

  const addEnvironmentVariables = async (envs: Env[]) => _client(
    "POST", `/v8/projects/${projectId}/env`,
    envs.map((env) => ({ type: "plain", target: ["production"], ...env })),
  );

  const removeEnvironmentVariables = async (envs: Env[]) => {
    const { envs: existingEnvs }: any = await _client('GET', `/v9/projects/${projectId}/env`);

    for (const env of envs) {
      const byName = (key: string) => (el: any) => el.key === key
      const envToRemove = existingEnvs.filter(byName(env.key)).shift();

      if (envToRemove) {
        await _client("DELETE", `/v9/projects/${projectId}/env/${envToRemove.id}`);
      }
    }
  }

  const setEnvironmentVariables = async (envs: Env[]) => {
    await removeEnvironmentVariables(envs);
    await addEnvironmentVariables(envs)
  }

  const createProject = async (name: string, envs: Env[], provider = 'github', owner: string, repoName: string) => {
    await _client("POST", 'https://api.vercel.com/v9/projects', {
      name,
      environmentVariables: envs,
      gitRepository: {
        type: provider,
        repo: `${owner}/${repoName}`,
      },
      framework: 'nextjs',
    })
  }

  return {
    addEnvironmentVariables,
    removeEnvironmentVariables,
    setEnvironmentVariables,
    createProject
  };
}
